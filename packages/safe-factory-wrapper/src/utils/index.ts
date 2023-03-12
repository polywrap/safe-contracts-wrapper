import {
  Ethereum_Connection,
  Ethereum_Module,
  SafeAccountConfig,
  SafeDeploymentConfig,
  SafeContracts_Ethereum_Connection,
  SafeContracts_Module,
  EthersUtils_Module,
} from "../wrap";
import { BigInt, Result, JSON } from "@polywrap/wasm-as";

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
    method: "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
    args: args,
  }).unwrap();
}

export function isContractDeployed(
  address: string,
  connection: Ethereum_Connection | null
): boolean {
  const code = Ethereum_Module.sendRpc({
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
    values: [u32(parseInt(nonce)).toString()]
  }); 
  if (saltNonce.isErr) {
    return saltNonce;
  }

  let initializerHash = EthersUtils_Module.keccak256({ value: initializer }); 
  if (initializerHash.isErr) {
    return Result.Err<string, string>(initializerHash.unwrapErr());
  }

  let initHash = initializerHash.unwrap();

  let encodePacked = EthersUtils_Module.keccak256BytesEncodePacked({
    value: initHash + saltNonce.unwrap().slice(2)
  });

  if (encodePacked.isErr) {
    return Result.Err<string, string>(encodePacked.unwrapErr());
  }

  return Result.Ok<string, string>(encodePacked.unwrap());
}

/**
 * EIP-1014
 * keccak256(0xff ++ address ++ salt ++ keccak256(init_code))[12:]
 * @address [address]
 * @salt [bytes32]
 * @initCode [bytes]
 */
export function calculateProxyAddress(
  address: string,
  salt: string,
  initCode: string
): Result<string, string> {

  const initCodeHash = EthersUtils_Module.generateCreate2Address({
    address,
    initCode,
    salt,
  });

  if (initCodeHash.isErr) {
    return initCodeHash;
  }

  return initCodeHash
}
