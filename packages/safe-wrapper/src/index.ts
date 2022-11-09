import {
  Args_encodeAddOwnerWithThresholdData,
  Args_encodeChangeThresholdData,
  Args_encodeDisableModuleData,
  Args_encodeEnableModuleData,
  Args_encodeRemoveOwnerData,
  Args_encodeSwapOwnerData,
  Args_getModules,
  Args_getOwners,
  Args_getThreshold,
  Args_isModuleEnabled,
  Args_isOwner,
  Args_createTransaction,
  Args_addSignature,
  Env,
  Ethereum_Module,
  SafeContracts_Module,
  SafeTransaction,
  SignSignature,
  SafeTransactionData,
  Logger_Module,
  Ethereum_TxReceipt,
} from "./wrap";
import { Args_getTransactionHash } from "./wrap/Module";
import {
  adjustVInSignature,
  arrayify,
  createTransactionFromPartial,
  encodeMultiSendData,
  getTransactionHashArgs,
} from "./utils";
import {
  Args_approvedHashes,
  Args_approveTransactionHash,
  Args_createMultiSendTransaction,
  Args_getMultiSendContract,
  Args_getOwnersWhoApprovedTx,
  Args_getSafeVersion,
  Args_signTransactionHash,
  Args_signTypedData,
} from "./wrap/Module/serialization";
import { BigInt, Box, JSON, JSONEncoder } from "@polywrap/wasm-as";
import {
  validateOwnerAddress,
  validateAddressIsNotOwner,
  validateThreshold,
  validateAddressIsOwnerAndGetPrev,
  validateModuleAddress,
  validateModuleIsNotEnabled,
  validateModuleIsEnabledAndGetPrev,
} from "./utils/validation";
import { generateTypedData, toJsonTypedData } from "./utils/typedData";

// Owner manager methods
export function getOwners(args: Args_getOwners, env: Env): string[] {
  const result = SafeContracts_Module.getOwners({
    address: env.safeAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function getThreshold(args: Args_getThreshold, env: Env): u32 {
  const result = SafeContracts_Module.getThreshold({
    address: env.safeAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function isOwner(args: Args_isOwner, env: Env): bool {
  const result = SafeContracts_Module.isOwner({
    address: env.safeAddress,
    ownerAddress: args.ownerAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function encodeAddOwnerWithThresholdData(args: Args_encodeAddOwnerWithThresholdData, env: Env): string {
  validateOwnerAddress(args.ownerAddress);
  const owners = getOwners({}, env);
  validateAddressIsNotOwner(args.ownerAddress, owners);
  let threshold: u32 = 0;
  if (args.threshold !== null) {
    threshold = args.threshold!.unwrap();
  } else {
    threshold = getThreshold({}, env);
  }
  validateThreshold(threshold, owners.length + 1);
  const result = Ethereum_Module.encodeFunction({
    method: "function addOwnerWithThreshold(address owner, uint256 _threshold) public",
    args: [args.ownerAddress, threshold.toString(16)],
  });
  return result.unwrap();
}

export function encodeRemoveOwnerData(args: Args_encodeRemoveOwnerData, env: Env): string {
  validateOwnerAddress(args.ownerAddress);
  const owners = getOwners({}, env);
  const prevOwnerAddress = validateAddressIsOwnerAndGetPrev(args.ownerAddress, owners);
  let threshold: u32 = 0;
  if (args.threshold !== null) {
    threshold = args.threshold!.unwrap();
  } else {
    threshold = getThreshold({}, env);
  }
  validateThreshold(threshold, owners.length - 1);
  const result = Ethereum_Module.encodeFunction({
    method: "function removeOwner(address prevOwner, address owner, uint256 _threshold) public",
    args: [prevOwnerAddress, args.ownerAddress, threshold.toString(16)],
  });
  return result.unwrap();
}

export function encodeSwapOwnerData(args: Args_encodeSwapOwnerData, env: Env): string {
  validateOwnerAddress(args.oldOwnerAddress);
  validateOwnerAddress(args.newOwnerAddress);
  const owners = getOwners({}, env);
  validateAddressIsNotOwner(args.newOwnerAddress, owners);
  const prevOwnerAddress = validateAddressIsOwnerAndGetPrev(args.oldOwnerAddress, owners);
  const result = Ethereum_Module.encodeFunction({
    method: "function swapOwner(address prevOwner, address oldOwner, address newOwner) public",
    args: [prevOwnerAddress, args.oldOwnerAddress, args.newOwnerAddress],
  });
  return result.unwrap();
}

export function encodeChangeThresholdData(args: Args_encodeChangeThresholdData, env: Env): string {
  validateThreshold(args.threshold, getOwners({}, env).length);
  const result = Ethereum_Module.encodeFunction({
    method: "function changeThreshold(uint256 _threshold) public",
    args: [args.threshold.toString(16)],
  });
  return result.unwrap();
}

// Module manager methods
export function getModules(args: Args_getModules, env: Env): string[] {
  const result = SafeContracts_Module.getModules({
    address: env.safeAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function isModuleEnabled(args: Args_isModuleEnabled, env: Env): bool {
  const result = SafeContracts_Module.isModuleEnabled({
    address: env.safeAddress,
    moduleAddress: args.moduleAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function encodeEnableModuleData(args: Args_encodeEnableModuleData, env: Env): string {
  validateModuleAddress(args.moduleAddress);
  validateModuleIsNotEnabled(args.moduleAddress, getModules({}, env));
  const result = Ethereum_Module.encodeFunction({
    method: "function enableModule(address module) public",
    args: [args.moduleAddress],
  });
  return result.unwrap();
}

export function encodeDisableModuleData(args: Args_encodeDisableModuleData, env: Env): string {
  validateModuleAddress(args.moduleAddress);
  const prevModuleAddress = validateModuleIsEnabledAndGetPrev(args.moduleAddress, getModules({}, env));
  const result = Ethereum_Module.encodeFunction({
    method: "function disableModule(address prevModule, address module) public",
    args: [prevModuleAddress, args.moduleAddress],
  });
  return result.unwrap();
}

// Transaction manager methods
export function createTransaction(args: Args_createTransaction, env: Env): SafeTransaction {
  const transactionData = createTransactionFromPartial(args.tx, args.options);

  return {
    data: transactionData,
    signatures: new Map<string, SignSignature>(),
  };
}

export function createMultiSendTransaction(args: Args_createMultiSendTransaction, env: Env): SafeTransaction {
  if (args.txs.length == 0) {
    throw new Error("Invalid empty array of transactions");
  }

  if (args.txs.length == 1) {
    return createTransaction({ tx: args.txs[0], options: args.options }, env);
  }

  const multiSendData = encodeMultiSendData(args.txs);

  const data = Ethereum_Module.encodeFunction({
    method: "function multiSend(bytes transactions) public",
    args: [multiSendData],
  }).unwrap();

  const transactionData = createTransactionFromPartial({ data: "", to: "", value: "" } as SafeTransactionData, null);

  let multiSendAddress: string = "";

  if (args.customMultiSendContractAddress != null) {
    multiSendAddress = args.customMultiSendContractAddress!;
  } else {
    const network = Ethereum_Module.getNetwork({ connection: env.connection }).unwrap();
    const isL1Safe = true; // TODO figure out how get it from safe
    const version = getSafeVersion({}, env);
    const contractNetworks = SafeContracts_Module.getSafeContractNetworks({
      chainId: network.chainId.toString(),
      isL1Safe: Box.from(isL1Safe),
      version: version,
    }).unwrap();

    if (args.onlyCalls) {
      multiSendAddress = contractNetworks!.multiSendCallOnlyAddress!;
    } else {
      multiSendAddress = contractNetworks!.multiSendAddress!;
    }
  }

  const multiSendTransaction: SafeTransactionData = {
    to: multiSendAddress,
    value: "0",
    data: data,
    operation: BigInt.from("1"), // OperationType.DelegateCall,
    baseGas: args.options != null && args.options!.baseGas ? args.options!.baseGas : transactionData.baseGas,
    gasPrice: args.options != null && args.options!.gasPrice ? args.options!.gasPrice : transactionData.gasPrice,
    gasToken: args.options != null && args.options!.gasToken ? args.options!.gasToken : transactionData.gasToken,
    nonce: args.options != null && args.options!.nonce ? args.options!.nonce : transactionData.nonce,
    refundReceiver:
      args.options != null && args.options!.refundReceiver
        ? args.options!.refundReceiver
        : transactionData.refundReceiver,
    safeTxGas: args.options != null && args.options!.safeTxGas ? args.options!.safeTxGas : transactionData.safeTxGas,
  };

  return {
    data: multiSendTransaction,
    signatures: new Map<string, SignSignature>(),
  };
}

export function addSignature(args: Args_addSignature, env: Env): SafeTransaction {
  const signerAddress = Ethereum_Module.getSignerAddress({
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  }).unwrap();

  const addressIsOwner = isOwner({ ownerAddress: signerAddress }, env);

  if (addressIsOwner == false) {
    throw new Error("Transactions can only be signed by Safe owners");
  }

  let signatures = args.tx.signatures;

  //If signature of current signer is already present - return transaction
  if (signatures != null) {
    if (signatures.has(signerAddress)) {
      return args.tx;
    }
  }

  //If no signatures - create signatures map
  if (signatures == null) {
    signatures = new Map<string, SignSignature>();
  }

  if (args.signingMethod != null && args.signingMethod! == "eth_signTypedData") {
    const signature = signTypedData({ tx: args.tx.data }, env);
    signatures.set(signerAddress, signature);
  } else {
    const transactionHash = getTransactionHash({ tx: args.tx.data }, env);
    const signature = signTransactionHash({ hash: transactionHash }, env);
    signatures.set(signerAddress, signature);
  }
  //Add signature of current signer
  args.tx.signatures = signatures;

  return args.tx;
}

export function getTransactionHash(args: Args_getTransactionHash, env: Env): string {
  const recreatedTx = createTransactionFromPartial(args.tx, null);

  const contractArgs = getTransactionHashArgs(recreatedTx);

  const res = Ethereum_Module.callContractView({
    address: env.safeAddress,
    method:
      "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
    args: contractArgs,
    connection: env.connection,
  }).unwrap();

  return res;
}

export function signTransactionHash(args: Args_signTransactionHash, env: Env): SignSignature {
  const signer = Ethereum_Module.getSignerAddress({
    connection: env.connection,
  }).unwrap();

  const byteArray = arrayify(args.hash).buffer;

  // TODO polywrap ethereum-plugin implementation required
  const signature = Ethereum_Module.signMessageBytes({
    bytes: byteArray,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  }).unwrap();

  const adjustedSignature = adjustVInSignature("eth_sign", signature, args.hash, signer);

  return { signer: signer, data: adjustedSignature };
}

export function approveTransactionHash(args: Args_approveTransactionHash, env: Env): Ethereum_TxReceipt {
  const signerAddress = Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap();

  const addressIsOwner = isOwner({ ownerAddress: signerAddress }, env);

  if (!addressIsOwner) {
    throw new Error("Transaction hashes can only be approved by Safe owners");
  }

  if (args.options != null && args.options!.gasPrice && args.options!.gasLimit) {
    throw new Error("Cannot specify gas and gasLimit together in transaction options");
  }

  if (args.options != null && !args.options!.gasLimit) {
    args.options!.gasLimit = SafeContracts_Module.estimateGas({
      address: env.safeAddress,
      method: "function approveHash(bytes32 hashToApprove) external",
      args: [args.hash],
      connection: {
        networkNameOrChainId: env.connection.networkNameOrChainId,
        node: env.connection.node,
      },
    }).unwrap();
  }

  const response = Ethereum_Module.callContractMethodAndWait({
    method: "function approveHash(bytes32 hashToApprove) external",
    address: env.safeAddress,
    args: [args.hash],
    connection: env.connection,
    txOverrides: {
      gasLimit: args.options ? args.options!.gasLimit : null,
      gasPrice: args.options ? args.options!.gasPrice : null,
      value: null,
    },
  }).unwrap();

  return response;
}

export function approvedHashes(args: Args_approvedHashes, env: Env): BigInt {
  const owner =
    args.owner != null ? args.owner! : Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap();

  const result = Ethereum_Module.callContractView({
    address: env.safeAddress,
    method: "function approvedHashes(address owner, bytes32 hash) public view returns (uint256)",
    args: [owner, args.hash],
    connection: env.connection,
  }).unwrap();

  return BigInt.from(result);
}

export function getOwnersWhoApprovedTx(args: Args_getOwnersWhoApprovedTx, env: Env): string[] {
  const owners = getOwners({}, env);
  const ownersWhoApproved: string[] = [];

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    const approved = approvedHashes({ owner, hash: args.hash }, env);
    if (approved.gt(0)) {
      ownersWhoApproved.push(owner);
    }
  }
  return ownersWhoApproved;
}

export function signTypedData(args: Args_signTypedData, env: Env): SignSignature {
  const recreatedTx = createTransactionFromPartial(args.tx, null);

  const safeVersion = getSafeVersion({}, env);

  const chainId = Ethereum_Module.getNetwork({ connection: env.connection }).unwrap().chainId;

  const typedData = generateTypedData(env.safeAddress, safeVersion, chainId, recreatedTx);
  const jsonTypedData = toJsonTypedData(typedData);

  const signature = Ethereum_Module.signTypedData({ payload: jsonTypedData, connection: env.connection }).unwrap()!;

  return {
    signer: Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap(),
    data: adjustVInSignature("eth_signTypedData", signature, null, null),
  };
}

// Contract manager methods

export function getSafeVersion(args: Args_getSafeVersion, env: Env): string {
  const version = Ethereum_Module.callContractView({
    address: env.safeAddress,
    method: "function VERSION() public view returns (string)",
    args: [],
    connection: env.connection,
  }).unwrap();

  return version;
}

export function getMultiSendContract(args: Args_getMultiSendContract, env: Env): string {
  const version = getSafeVersion({}, env);

  const contractNetworks = SafeContracts_Module.getSafeContractNetworks({
    version: version,
    chainId: env.connection.networkNameOrChainId!,
    isL1Safe: Box.from(false),
  }).unwrap()!;

  return contractNetworks.multiSendAddress!;
}
