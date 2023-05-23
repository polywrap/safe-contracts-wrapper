import { BigInt } from "@polywrap/wasm-as";
import {
  encodeSetupCallData,
  generateSalt,
  getInitCode,
  isContractDeployed,
  prepareSafeDeployPayload,
} from "./utils";
import {
  Args_predictSafeAddress,
  SafeContracts_Ethers_TxOptions,
  SafeContracts_Module,
  Args_deploySafe,
  SafeContracts_Ethers_Connection,
  EthersUtils_Module,
  Args_encodeDeploySafe,
  Args_safeIsDeployed,
  Args_getSafeInitializer,
  ModuleBase,
} from "./wrap";

export class Module extends ModuleBase {
  getSafeInitializer(args: Args_getSafeInitializer): string {
    return encodeSetupCallData(args.config);
  }

  deploySafe(args: Args_deploySafe): string {
    const payload = prepareSafeDeployPayload(
      args.input.safeAccountConfig,
      args.input.safeDeploymentConfig,
      args.input.customContractAddresses,
      args.input.connection
    );

    let txOptions: SafeContracts_Ethers_TxOptions | null = null;

    if (args.txOptions != null) {
      txOptions = {
        value: args.txOptions!.value,
        gasLimit: null,
        gasPrice: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        nonce: null,
      };
    }

    let connection: SafeContracts_Ethers_Connection | null = null;
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

  predictSafeAddress(args: Args_predictSafeAddress): string {
    const payload = prepareSafeDeployPayload(
      args.input.safeAccountConfig,
      args.input.safeDeploymentConfig,
      args.input.customContractAddresses,
      args.input.connection
    );

    const salt = generateSalt(payload.saltNonce, payload.initializer);
    if (salt.isErr) {
      throw salt.err().unwrap();
    }

    let connection: SafeContracts_Ethers_Connection | null = null;
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

    let derivedAddress = EthersUtils_Module.generateCreate2Address({
      address: payload.safeFactoryContractAddress,
      salt: salt.unwrap(),
      initCode: initCode.unwrap(),
    });

    if (derivedAddress.isErr) {
      throw derivedAddress.err().unwrap();
    }

    return derivedAddress.unwrap();
  }

  safeIsDeployed(args: Args_safeIsDeployed): bool {
    return isContractDeployed(args.safeAddress, args.connection);
  }

  encodeDeploySafe(args: Args_encodeDeploySafe): string {
    const payload = prepareSafeDeployPayload(
      args.input.safeAccountConfig,
      args.input.safeDeploymentConfig,
      args.input.customContractAddresses,
      args.input.connection
    );

    return EthersUtils_Module.encodeFunction({
      method: "function createProxyWithNonce(address,bytes memory,uint256)",
      args: [
        payload.safeContractAddress,
        payload.initializer,
        BigInt.fromString(payload.saltNonce).toString(),
      ],
    }).unwrap();
  }
}
