import { BigInt, Box } from "@polywrap/wasm-as";
import {
  encodeSetupCallData,
  calculateProxyAddress,
  generateSalt,
  getInitCode,
  validateSafeAccountConfig,
  validateSafeDeploymentConfig,
  isContractDeployed,
} from "./utils";
import {
  Args_getChainId,
  Args_predictSafeAddress,
  Datetime_Module,
  Ethereum_Module,
  SafePayload,
  SafeContracts_Ethereum_TxOptions,
  SafeContracts_Module,
  SafeAccountConfig,
  SafeDeploymentConfig,
  CustomContract,
  Ethereum_Connection,
  Args_deploySafe,
  SafeContracts_Ethereum_Connection,
} from "./wrap";

export function getChainId(args: Args_getChainId): String {
  return Ethereum_Module.getChainId({
    connection: args.connection,
  }).unwrap();
}

export function deploySafe(args: Args_deploySafe): String {
  const connection = args.connection;
  const payload = prepareSafeDeployPayload(
    args.safeAccountConfig,
    args.safeDeploymentConfig,
    args.customContractAdressess,
    connection
  );

  let txOptions: SafeContracts_Ethereum_TxOptions | null = null;

  if (args.txOptions != null) {
    txOptions = {
      value: null,
      gasLimit: null,
      gasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      nonce: null,
    };

    if (args.txOptions!.value != BigInt.ZERO) {
      txOptions.value = args.txOptions!.value;
    }
  }

  const safeAddress = SafeContracts_Module.createProxy({
    safeMasterCopyAddress: payload.safeContractAddress,
    address: payload.safeFactoryContractAddress,
    connection: {
      node: connection!.node,
      networkNameOrChainId: connection!.networkNameOrChainId,
    },
    initializer: payload.initializer,
    saltNonce: <u32>BigInt.from(payload.saltNonce).toUInt64(),
    txOptions,
  }).unwrap();

  const contractDeployed = isContractDeployed(safeAddress, connection);
  if (!contractDeployed) {
    throw new Error(
      "SafeProxy contract is not deployed on the current network"
    );
  }

  return safeAddress;
}

export function predictSafeAddress(args: Args_predictSafeAddress): String {
  const payload = prepareSafeDeployPayload(
    args.safeAccountConfig,
    args.safeDeploymentConfig,
    args.customContractAdressess,
    args.connection
  );

  const salt = generateSalt(payload.saltNonce, payload.initializer);
  if (salt.isErr) {
    throw salt.err().unwrap();
  }

  const connection: SafeContracts_Ethereum_Connection | null = {
    node: args.connection!.node,
    networkNameOrChainId: args.connection!.networkNameOrChainId,
  };
  const initCode = getInitCode(
    payload.safeFactoryContractAddress,
    payload.safeContractAddress,
    connection
  );
  if (initCode.isErr) {
    throw initCode.err().unwrap()
  }

  let derivedAddress = calculateProxyAddress(
    payload.safeFactoryContractAddress,
    salt.unwrap(),
    initCode.unwrap()
  );
  if (derivedAddress.isErr) {
    throw derivedAddress.err().unwrap();
  }

  return derivedAddress.unwrap();
}

function prepareSafeDeployPayload(
  safeAccountConfig: SafeAccountConfig,
  safeDeploymentConfig: SafeDeploymentConfig | null,
  customContractAdressess: CustomContract | null,
  connection: Ethereum_Connection | null
): SafePayload {
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

  const chainId = getChainId({ connection: connection });

  let safeContractAddress: string = "";
  let safeFactoryContractAddress: string = "";

  if (customContractAdressess != null) {
    if (customContractAdressess.proxyFactoryContract != null) {
      safeFactoryContractAddress =
        customContractAdressess.proxyFactoryContract!;
    }
    if (customContractAdressess.safeFactoryContract != null) {
      safeContractAddress = customContractAdressess.safeFactoryContract!;
    }
  }

  if (safeContractAddress == "") {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: Box.from(true),
        safeProxyFactoryAddress: Box.from(false),
        multiSendAddress: Box.from(false),
        multiSendCallOnlyAddress: Box.from(false),
        fallbackHandlerAddress: Box.from(false),
      },
    }).unwrap();
    safeContractAddress = contracts!.safeMasterCopyAddress!;
  }

  if (safeFactoryContractAddress == "") {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: Box.from(false),
        safeProxyFactoryAddress: Box.from(true),
        multiSendAddress: Box.from(false),
        multiSendCallOnlyAddress: Box.from(false),
        fallbackHandlerAddress: Box.from(false),
      },
    }).unwrap();
    safeFactoryContractAddress = contracts!.safeProxyFactoryAddress!;
  }
  if (safeAccountConfig.fallbackHandler == null) {
    const contracts = SafeContracts_Module.getSafeContractNetworks({
      version: safeContractVersion,
      chainId: chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      filter: {
        safeMasterCopyAddress: Box.from(false),
        safeProxyFactoryAddress: Box.from(false),
        multiSendAddress: Box.from(false),
        multiSendCallOnlyAddress: Box.from(false),
        fallbackHandlerAddress: Box.from(true),
      },
    }).unwrap()
    safeAccountConfig.fallbackHandler = contracts!.fallbackHandlerAddress;
  }

  const initializer = encodeSetupCallData(safeAccountConfig);
  return {
    initializer,
    saltNonce,
    safeFactoryContractAddress,
    safeContractAddress,
  };
}
