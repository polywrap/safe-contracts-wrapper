import {
  Ethers_Connection,
  Ethers_Module,
  SafeAccountConfig,
  SafeDeploymentConfig,
  SafeContracts_Ethers_Connection,
  SafeContracts_Module,
  EthersUtils_Module,
  CustomContract,
  Datetime_Module,
  DeploymentPayload,
} from "../wrap";
import { BigInt, Result, JSON, Box } from "@polywrap/wasm-as";

export const ZERO_ADDRESS = `0x${"0".repeat(40)}`;
export const EMPTY_DATA = "0x";

export const validateSafeAccountConfig = (config: SafeAccountConfig): void => {
  if (config.owners.length <= 0)
    throw new Error("Owner list must have at least one owner");

  const threshold = config.threshold;

  if (threshold) {
    if (threshold <= 0)
      throw new Error("Threshold must be greater than or equal to 1");
    if (threshold > <u32>config.owners.length)
      throw new Error("Threshold must be lower than or equal to owners length");
  }
};

export const validateSafeDeploymentConfig = (
  config: SafeDeploymentConfig
): void => {
  if (BigInt.from(config.saltNonce).lt(0))
    throw new Error("saltNonce must be greater than or equal to 0");
};

export function encodeSetupCallData(accountConfig: SafeAccountConfig): string {
  const args: string[] = [];

  args.push(JSON.from(accountConfig.owners).stringify());

  const threshold = accountConfig.threshold.toString();

  args.push(<string>threshold);

  if (accountConfig.to != null) {
    args.push(accountConfig.to!);
  } else {
    args.push(ZERO_ADDRESS);
  }
  if (accountConfig.data != null) {
    args.push(accountConfig.data!);
  } else {
    args.push(EMPTY_DATA);
  }
  if (accountConfig.fallbackHandler != null) {
    args.push(accountConfig.fallbackHandler!);
  } else {
    args.push(ZERO_ADDRESS);
  }
  if (accountConfig.paymentToken != null) {
    args.push(accountConfig.paymentToken!);
  } else {
    args.push(ZERO_ADDRESS);
  }
  if (accountConfig.payment) {
    args.push(accountConfig.payment!.toString());
  } else {
    args.push("0");
  }
  if (accountConfig.paymentReceiver != null) {
    args.push(accountConfig.paymentReceiver!);
  } else {
    args.push(ZERO_ADDRESS);
  }

  return EthersUtils_Module.encodeFunction({
    method:
      "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
    args: args,
  }).unwrap();
}

export function isContractDeployed(
  address: string,
  connection: Ethers_Connection | null
): boolean {
  const code = Ethers_Module.sendRpc({
    method: "eth_getCode",
    connection: connection,
    params: [address, "pending"],
  }).unwrap();

  if (code != null) {
    return code != "0x";
  }
  return false;
}

export function getInitCode(
  safeProxyFactoryAddr: string,
  gnosisSafeAddr: string,
  connection: SafeContracts_Ethers_Connection | null
): Result<string, string> {
  const proxyCreationCode = SafeContracts_Module.proxyCreationCode({
    address: safeProxyFactoryAddr,
    connection: connection,
  });
  if (proxyCreationCode.isErr) {
    return proxyCreationCode;
  }

  const constructorData = EthersUtils_Module.encodeParams({
    types: ["address"],
    values: [gnosisSafeAddr],
  });
  if (constructorData.isErr) {
    return constructorData;
  }

  return Result.Ok<string, string>(
    proxyCreationCode.unwrap() + constructorData.unwrap().slice(2)
  );
}

export function generateSalt(
  nonce: string,
  initializer: string
): Result<string, string> {
  const saltNonce = EthersUtils_Module.encodeParams({
    types: ["uint256"],
    values: [BigInt.fromString(nonce).toString()],
  });
  if (saltNonce.isErr) {
    return saltNonce;
  }
  let initializerHash = EthersUtils_Module.keccak256({ value: initializer });
  if (initializerHash.isErr) {
    return Result.Err<string, string>(initializerHash.unwrapErr());
  }

  let initHash = initializerHash.unwrap();

  return EthersUtils_Module.keccak256({
    value: EthersUtils_Module.solidityPack({
      values: [initHash + saltNonce.unwrap().slice(2)],
      types: ["bytes"],
    }).unwrap(),
  });
}

export function prepareSafeDeployPayload(
  safeAccountConfig: SafeAccountConfig,
  safeDeploymentConfig: SafeDeploymentConfig | null,
  customContractAddresses: CustomContract | null,
  connection: Ethers_Connection | null
): DeploymentPayload {
  validateSafeAccountConfig(safeAccountConfig);
  if (safeDeploymentConfig != null) {
    validateSafeDeploymentConfig(safeDeploymentConfig);
  }

  let saltNonce: string = "";
  let safeContractVersion: string = "1.3.0";
  let isL1Safe = false;

  // TODO: handle partial config, fallback on each option separately
  if (safeDeploymentConfig != null) {
    if (safeDeploymentConfig.saltNonce != null) {
      saltNonce = safeDeploymentConfig.saltNonce;
    }
    if (safeDeploymentConfig.version != null) {
      safeContractVersion = safeDeploymentConfig.version!;
    }
    if (safeDeploymentConfig.isL1Safe) {
      isL1Safe = true;
    }
  } else {
    const timestamp = Datetime_Module.currentTimestamp({}).unwrap();
    // TODO: Add Math.random() to timestamp
    const res = timestamp.mul(1000);
    saltNonce = res.toString();
    safeContractVersion = "1.3.0";
  }

  const chainId = Ethers_Module.getChainId({ connection }).unwrap();
  let safeContractAddress: string = "";
  let safeFactoryContractAddress: string = "";

  if (customContractAddresses != null) {
    if (customContractAddresses.proxyFactoryContract != null) {
      safeFactoryContractAddress =
        customContractAddresses.proxyFactoryContract!;
    }
    if (customContractAddresses.safeFactoryContract != null) {
      safeContractAddress = customContractAddresses.safeFactoryContract!;
    }
  }

  if (safeContractAddress == "") {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: true,
        safeProxyFactoryAddress: false,
        multiSendAddress: false,
        multiSendCallOnlyAddress: false,
        fallbackHandlerAddress: false,
      },
    }).unwrap();
    safeContractAddress = contracts.safeMasterCopyAddress!;
  }

  if (safeFactoryContractAddress == "") {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: false,
        safeProxyFactoryAddress: true,
        multiSendAddress: false,
        multiSendCallOnlyAddress: false,
        fallbackHandlerAddress: false,
      },
    }).unwrap();
    safeFactoryContractAddress = contracts.safeProxyFactoryAddress!;
  }
  if (safeAccountConfig.fallbackHandler == null) {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: false,
        safeProxyFactoryAddress: false,
        multiSendAddress: false,
        multiSendCallOnlyAddress: false,
        fallbackHandlerAddress: true,
      },
    }).unwrap();
    safeAccountConfig.fallbackHandler = contracts.fallbackHandlerAddress;
  }

  const initializer = encodeSetupCallData(safeAccountConfig);
  return {
    initializer,
    saltNonce,
    safeFactoryContractAddress,
    safeContractAddress,
  };
}
