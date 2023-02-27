import { BigInt } from "@polywrap/wasm-as";
import {
  encodeSetupCallData,
  generateAddress2,
  generateSalt,
  getInitCode,
  getMultiSendCallOnlyContractAddress,
  getMultiSendContractAddress,
  getSafeContractAddress,
  getSafeFactoryContractAddress,
  isContractDeployed,
  validateSafeAccountConfig,
  validateSafeDeploymentConfig,
} from "./utils";
import {
  Args_deploySafe,
  Args_getChainId,
  Args_predictSafeAddress,
  Datetime_Module,
  Ethereum_Module,
  // Logger_Module,
  SafePayload,
  SafeContracts_Ethereum_Connection,
  SafeContracts_Ethereum_TxOptions,
  SafeContracts_Module,
} from "./wrap";

export function getChainId(args: Args_getChainId): String {
  return Ethereum_Module.getChainId({
    connection: args.connection,
  }).unwrap();
}

export function deploySafe(args: Args_deploySafe): SafePayload | null {

  validateSafeAccountConfig(args.safeAccountConfig);

  if (args.safeDeploymentConfig != null) {
    validateSafeDeploymentConfig(args.safeDeploymentConfig!);
  }

  const initializer = encodeSetupCallData(args.safeAccountConfig);

  // Logger_Module.log({ level: 0, message: "initializer" + initializer });

  let saltNonce: string = "";
  let safeContractVersion: string = "1.3.0";
  let isL1Safe = false;

  // TODO: handle partial config, fallback on each option separately
  if (args.safeDeploymentConfig != null) {
    if (args.safeDeploymentConfig!.saltNonce != null) {
      saltNonce = args.safeDeploymentConfig!.saltNonce;
    }
    if (args.safeDeploymentConfig!.version != null) {
      safeContractVersion = args.safeDeploymentConfig!.version!;
    }
    if (args.safeDeploymentConfig!.isL1Safe) {
      isL1Safe = true;
    }
  } else {
    const timestamp = Datetime_Module.currentTimestamp({}).unwrap();
    const res = timestamp.mul(1000); //.add(Math.floor(Math.random() * 1000)); // TODO Math.random()

    /* saltNonce = (Date.now() * 1000 + Math.floor(Math.random() * 1000)).toString(); */
    saltNonce = res.toString();

    // Logger_Module.log({ level: 0, message: "saltNonce" + saltNonce });
    safeContractVersion = "1.3.0";
  }

  let connection: SafeContracts_Ethereum_Connection | null = null;
  if (args.connection != null) {
    connection = {
      node: args.connection!.node,
      networkNameOrChainId: args.connection!.networkNameOrChainId,
    };
  }

  let txOptions: SafeContracts_Ethereum_TxOptions | null = null;

  if (args.txOptions != null) {
    txOptions = { value: null, gasLimit: null, gasPrice: null };
    if (args.txOptions!.value) {
      txOptions.value = args.txOptions!.value;
    }
    if (args.txOptions!.gasLimit) {
      txOptions.gasLimit = args.txOptions!.gasLimit;
    }
    if (args.txOptions!.gasPrice) {
      txOptions.gasPrice = args.txOptions!.gasPrice;
    }
  }
  const chainId = getChainId({ connection: args.connection });

  // Logger_Module.log({ level: 0, message: "chainId: " + chainId.toString() });

  let safeContractAddress: string = "";
  let safeFactoryContractAddress: string = "";

  if (args.customContractAdressess != null) {
    if (args.customContractAdressess!.proxyFactoryContract != null) {
      safeFactoryContractAddress =
        args.customContractAdressess!.proxyFactoryContract!;
    } else {
      safeContractAddress = getSafeContractAddress(
        safeContractVersion,
        chainId.toString(),
        !isL1Safe
      );
    }
    if (args.customContractAdressess!.safeFactoryContract != null) {
      safeContractAddress = args.customContractAdressess!.safeFactoryContract!;
    } else {
      safeFactoryContractAddress = getSafeFactoryContractAddress(
        safeContractVersion,
        chainId.toString()
      );
    }
  } else {
    safeContractAddress = getSafeContractAddress(
      safeContractVersion,
      chainId.toString(),
      !isL1Safe
    );

    safeFactoryContractAddress = getSafeFactoryContractAddress(
      safeContractVersion,
      chainId.toString()
    );
  }

  // Logger_Module.log({
  //   level: 0,
  //   message: "safeFactoryContractAddress" + safeFactoryContractAddress,
  // });

  // Logger_Module.log({
  //   level: 0,
  //   message: "safeContractAddress" + safeContractAddress,
  // });

  const safeAddress = SafeContracts_Module.createProxy({
    safeMasterCopyAddress: safeContractAddress,
    address: safeFactoryContractAddress,
    connection: connection,
    initializer: initializer,
    saltNonce: <u32>BigInt.from(saltNonce).toUInt64(),
    txOptions: txOptions,
  }).unwrap();

  if (safeAddress != null) {
    // Logger_Module.log({
    //   level: 0,
    //   message: "safeAddress" + safeAddress!,
    // });

    const contractDeployed = isContractDeployed(safeAddress!, args.connection);

    if (!contractDeployed) {
      throw new Error(
        "SafeProxy contract is not deployed on the current network"
      );
    } else {
      return {
        safeAddress: safeAddress!,
        isL1SafeMasterCopy: isL1Safe,
        contractNetworks: {
          multiSendAddress: getMultiSendContractAddress(
            safeContractVersion,
            chainId.toString()
          ),
          multiSendCallOnlyAddress: getMultiSendCallOnlyContractAddress(
            safeContractVersion,
            chainId.toString()
          ),
          safeMasterCopyAddress: safeContractAddress,
          safeProxyFactoryAddress: safeFactoryContractAddress,
        },
      };
    }
  }

  return null;
}

export function predictSafeAddress(args: Args_predictSafeAddress): String {
  validateSafeAccountConfig(args.safeAccountConfig);
  if (args.safeDeploymentConfig != null) {
    validateSafeDeploymentConfig(args.safeDeploymentConfig!);
  }

  let connection: SafeContracts_Ethereum_Connection | null = null;
  if (args.connection != null) {
    connection = {
      node: args.connection!.node,
      networkNameOrChainId: args.connection!.networkNameOrChainId,
    };
  }
  const initializer = encodeSetupCallData(args.safeAccountConfig);

  let saltNonce: string = "";
  let safeContractVersion: string = "1.3.0";
  let isL1Safe = false;
  if (args.safeDeploymentConfig != null) {
    if (args.safeDeploymentConfig!.saltNonce != null) {
      saltNonce = args.safeDeploymentConfig!.saltNonce;
    }
    if (args.safeDeploymentConfig!.version != null) {
      safeContractVersion = args.safeDeploymentConfig!.version!;
    }
    if (args.safeDeploymentConfig!.isL1Safe) {
      isL1Safe = true;
    }
  } else {
    const timestamp = Datetime_Module.currentTimestamp({}).unwrap();
    const res = timestamp.mul(1000); //.add(Math.floor(Math.random() * 1000)); // TODO Math.random()

    /* saltNonce = (Date.now() * 1000 + Math.floor(Math.random() * 1000)).toString(); */
    saltNonce = res.toString();

    // Logger_Module.log({ level: 0, message: "saltNonce" + saltNonce });
    safeContractVersion = "1.3.0";
  }

  const chainId = getChainId({ connection: args.connection });

  let safeContractAddress: string = "";
  let safeFactoryContractAddress: string = "";

  if (args.customContractAdressess != null) {
    if (args.customContractAdressess!.proxyFactoryContract != null) {
      safeFactoryContractAddress =
        args.customContractAdressess!.proxyFactoryContract!;
    } else {
      safeContractAddress = getSafeContractAddress(
        safeContractVersion,
        chainId.toString(),
        !isL1Safe
      );
    }
    if (args.customContractAdressess!.safeFactoryContract != null) {
      safeContractAddress = args.customContractAdressess!.safeFactoryContract!;
    } else {
      safeFactoryContractAddress = getSafeFactoryContractAddress(
        safeContractVersion,
        chainId.toString()
      );
    }
  } else {
    safeContractAddress = getSafeContractAddress(
      safeContractVersion,
      chainId.toString(),
      !isL1Safe
    );

    safeFactoryContractAddress = getSafeFactoryContractAddress(
      safeContractVersion,
      chainId.toString()
    );
  }

  // Logger_Module.log({ level: 0, message: "initializer " + initializer.slice(2) });

  const salt = generateSalt(saltNonce, initializer);
  if (salt.isErr) {
    // Logger_Module.log({ level: 0, message: "salt error: " + salt.unwrapErr() });
    return "";
  }
  // Logger_Module.log({ level: 0, message: "salt " + salt.unwrap() });

  const initCode = getInitCode(
    safeFactoryContractAddress,
    safeContractAddress,
    connection
  );
  if (initCode.isErr) {
    // Logger_Module.log({
    // level: 0,
    //   message: "initCode error: " + initCode.unwrapErr(),
    // });
    return "";
  }
  // Logger_Module.log({ level: 0, message: "initCode " + initCode.unwrap() });

  let address = generateAddress2(
    safeFactoryContractAddress,
    salt.unwrap(),
    initCode.unwrap()
  );
  if (address.isErr) {
    // Logger_Module.log({
    //   level: 0,
    //   message: "address error: " + address.unwrapErr(),
    // });
    return "";
  }
  // Logger_Module.log({ level: 0, message: "address generate from create 2 " + address.unwrap() });

  return address.unwrap();
}
