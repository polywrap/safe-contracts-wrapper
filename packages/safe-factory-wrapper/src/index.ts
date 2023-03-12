import { BigInt } from "@polywrap/wasm-as";
import {
  calculateProxyAddress,
  generateSalt,
  getInitCode,
  isContractDeployed,
  prepareSafeDeployPayload,
} from "./utils";
import {
  Args_predictSafeAddress,
  SafeContracts_Ethereum_TxOptions,
  SafeContracts_Module,
  Args_deploySafe,
  SafeContracts_Ethereum_Connection,
  EthersUtils_Module,
  Args_deploySafeEncodedTransaction,
  Args_safeIsDeployed,
} from "./wrap";

export function deploySafe(args: Args_deploySafe): String {
  const payload = prepareSafeDeployPayload(
    args.input.safeAccountConfig,
    args.input.safeDeploymentConfig,
    args.input.customContractAdressess,
    args.input.connection
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

  let connection: SafeContracts_Ethereum_Connection | null = null;
  if (args.input.connection != null) {
    connection = {
      node: args.input.connection!.node,
      networkNameOrChainId: args.input.connection!.networkNameOrChainId,
    };
  }
  const safeAddress = SafeContracts_Module.createProxy({
    safeMasterCopyAddress: payload.safeContractAddress,
    address: payload.safeFactoryContractAddress,
    connection,
    initializer: payload.initializer,
    saltNonce: <u32>BigInt.from(payload.saltNonce).toUInt64(),
    txOptions,
  }).unwrap();

  const contractDeployed = isContractDeployed(
    safeAddress,
    args.input.connection
  );
  if (!contractDeployed) {
    throw new Error(
      "SafeProxy contract is not deployed on the current network"
    );
  }

  return safeAddress;
}

export function predictSafeAddress(args: Args_predictSafeAddress): String {
  const payload = prepareSafeDeployPayload(
    args.input.safeAccountConfig,
    args.input.safeDeploymentConfig,
    args.input.customContractAdressess,
    args.input.connection
  );

  const salt = generateSalt(payload.saltNonce, payload.initializer);
  if (salt.isErr) {
    throw salt.err().unwrap();
  }

  let connection: SafeContracts_Ethereum_Connection | null = null;
  if (args.input.connection != null) {
    connection = {
      node: args.input.connection!.node,
      networkNameOrChainId: args.input.connection!.networkNameOrChainId,
    };
  }
  const initCode = getInitCode(
    payload.safeFactoryContractAddress,
    payload.safeContractAddress,
    connection
  );
  if (initCode.isErr) {
    throw initCode.err().unwrap();
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

export function safeIsDeployed(args: Args_safeIsDeployed): bool {
  return isContractDeployed(args.safeAddress, args.connection);
}

export function deploySafeEncodedTransaction(
  args: Args_deploySafeEncodedTransaction
): String {
  const payload = prepareSafeDeployPayload(
    args.input.safeAccountConfig,
    args.input.safeDeploymentConfig,
    args.input.customContractAdressess,
    args.input.connection
  );

  return EthersUtils_Module.encodeFunction({
    method: "function createProxyWithNonce(address,bytes memory,uint256)",
    args: [
      payload.safeContractAddress,
      payload.initializer,
      payload.saltNonce.toString(),
    ],
  }).unwrap();
}
