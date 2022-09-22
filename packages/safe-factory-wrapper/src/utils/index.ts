import {
  Ethereum_Connection,
  Ethereum_Module,
  SafeAccountConfig,
  SafeDeploymentConfig,
  SafeContracts_Ethereum_Connection,
  SafeContracts_Module,
} from "../wrap";
import { BigInt, Result } from "@polywrap/wasm-as";
import {
  getMultisendCallOnlyContractMap,
  getMultisendContractMap,
  getSafeContractMap,
  getSafeFactoryContractMap,
} from "./contractAddresses";
import { JSON } from "@polywrap/wasm-as";

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

  return SafeContracts_Module.encode({
    method:
      "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)",
    args: args,
  }).unwrap();
}

export function getSafeContractAddress(
  safeVersion: string,
  chainId: string,
  isL2: boolean = false
): string {
  const safeContractMap = getSafeContractMap(safeVersion, isL2);

  const hasContractAddress = safeContractMap.has(chainId);

  if (hasContractAddress) {
    const contractAddress = safeContractMap.get(chainId);
    return <string>contractAddress;
  } else {
    throw new Error("No safe contract for provided chainId");
  }
}

export function getSafeFactoryContractAddress(
  safeVersion: string,
  chainId: string
): string {
  const safeFactoryContractMap = getSafeFactoryContractMap(safeVersion);

  const hasContractAddress = safeFactoryContractMap.has(chainId);
  if (hasContractAddress) {
    const contractAddress = safeFactoryContractMap.get(chainId);
    return <string>contractAddress;
  } else {
    throw new Error("No factory contract for provided chainId");
  }
}
export function getMultiSendContractAddress(
  safeVersion: string,
  chainId: string
): string {
  const multiSendContractMap = getMultisendContractMap(safeVersion);

  const hasMultisendContractAddress = multiSendContractMap.has(chainId);
  if (hasMultisendContractAddress) {
    return <string>multiSendContractMap.get(chainId);
  } else {
    throw new Error("No multisend contract for provided chainId");
  }
}
export function getMultiSendCallOnlyContractAddress(
  safeVersion: string,
  chainId: string
): string {
  const multiSendContractMap = getMultisendCallOnlyContractMap(safeVersion);

  const hasMultisendContractAddress = multiSendContractMap.has(chainId);
  if (hasMultisendContractAddress) {
    return <string>multiSendContractMap.get(chainId);
  } else {
    throw new Error("No multisend call only contract for provided chainId");
  }
}

export function isContractDeployed(
  address: string,
  connection: Ethereum_Connection | null
): boolean {
  const code = Ethereum_Module.sendRPC({
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
  connection: SafeContracts_Ethereum_Connection | null
): Result<string, string> {
  const proxyCreationCode = SafeContracts_Module.proxyCreationCode({
    address: safeProxyFactoryAddr,
    connection: connection
  });
  if (proxyCreationCode.isErr) {
    return proxyCreationCode;
  }

  const constructorData = Ethereum_Module.encodeParams({
    types: ["address"],
    values: [gnosisSafeAddr],
  });
  if (constructorData.isErr) {
    return constructorData;
  }

  return Result.Ok<string, string>(proxyCreationCode.unwrap() + constructorData.unwrap().slice(2));
}

export function generateSalt(nonce: string, initializer: string): Result<string, string> {
  const encodedNonce = Ethereum_Module.encodeParams({
    types: ["uint256"],
    values: [nonce],
  });
  if (encodedNonce.isErr) {
    return encodedNonce;
  }

  const initializerHash = Ethereum_Module.solidityKeccak256({
    types: ["bytes"],
    values: [initializer],
  });
  if (initializerHash.isErr) {
    return initializerHash;
  }

  return Ethereum_Module.solidityKeccak256({
    types: ["bytes"],
    values: [
      initializerHash.unwrap() + encodedNonce.unwrap().slice(2)
    ],
  });
}

/**
 * EIP-1014
 * keccak256(0xff ++ address ++ salt ++ keccak256(init_code))[12:]
 * @address [address]
 * @salt [bytes32]
 * @initCode [bytes]
 */
export function generateAddress2(
  address: string,
  salt: string,
  initCode: string,
): Result<string, string> {
  const initCodeHash = Ethereum_Module.solidityKeccak256({
    types: ["bytes"],
    values: [initCode],
  });
  if (initCodeHash.isErr) {
    return initCodeHash;
  }

  const hash = Ethereum_Module.solidityKeccak256({
    types: ["bytes1", "address", "bytes32", "bytes32"],
    values: [
      "0xff",
      address,
      salt,
      initCodeHash.unwrap(),
    ],
  });
  if (hash.isErr) {
    return hash;
  }

  return Result.Ok<string, string>("0x" + hash.unwrap().slice(-40));
}
