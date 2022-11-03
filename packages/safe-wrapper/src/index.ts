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
} from "./wrap";
import { Args_getTransactionHash } from "./wrap/Module";
import {
  adjustVInSignature,
  arrayify,
  createTransactionFromPartial,
  encodeMultiSendData,
  getTransactionHashArgs,
} from "./utils";
import { Args_createMultiSendTransaction, Args_signTransactionHash } from "./wrap/Module/serialization";
import { BigInt } from "@polywrap/wasm-as";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SENTINEL_ADDRESS = "0x0000000000000000000000000000000000000001";

function sameString(str1: string, str2: string): bool {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  return s1 == s2;
}

function findIndex(item: string, items: string[]): i32 {
  for (let i = 0, ln = items.length; i < ln; i++) {
    if (sameString(item, items[i])) {
      return i;
    }
  }
  return -1;
}

export function isZeroAddress(address: string): bool {
  return sameString(address, ZERO_ADDRESS);
}

function isSentinelAddress(address: string): bool {
  return sameString(address, SENTINEL_ADDRESS);
}

export function isRestrictedAddress(address: string): bool {
  return isZeroAddress(address) || isSentinelAddress(address);
}

function validateOwnerAddress(ownerAddress: string): void {
  const isValidAddress = Ethereum_Module.checkAddress({
    address: ownerAddress,
  });
  if (!isValidAddress || isRestrictedAddress(ownerAddress)) {
    throw new Error("Invalid owner address provided");
  }
}

function validateAddressIsNotOwner(ownerAddress: string, owners: string[]): void {
  const ownerIndex = findIndex(ownerAddress, owners);
  if (ownerIndex >= 0) {
    throw new Error("Address provided is already an owner");
  }
}

function validateAddressIsOwnerAndGetPrev(ownerAddress: string, owners: string[]): string {
  const ownerIndex = findIndex(ownerAddress, owners);
  if (ownerIndex < 0) {
    throw new Error("Address provided is not an owner");
  }
  if (ownerIndex == 0) {
    return SENTINEL_ADDRESS;
  }
  return owners[ownerIndex - 1];
}

function validateThreshold(threshold: number, numOwners: number): void {
  if (threshold <= 0) {
    throw new Error("Threshold needs to be greater than 0");
  }
  if (threshold > numOwners) {
    throw new Error("Threshold cannot exceed owner count");
  }
}

function validateModuleAddress(moduleAddress: string): void {
  const isValidAddress = Ethereum_Module.checkAddress({
    address: moduleAddress,
  });
  if (!isValidAddress.unwrap() || isRestrictedAddress(moduleAddress)) {
    throw new Error("Invalid module address provided");
  }
}

function validateModuleIsNotEnabled(moduleAddress: string, modules: string[]): void {
  const moduleIndex = findIndex(moduleAddress, modules);
  if (moduleIndex >= 0) {
    throw new Error("Module provided is already enabled");
  }
}

function validateModuleIsEnabledAndGetPrev(moduleAddress: string, modules: string[]): string {
  const moduleIndex = findIndex(moduleAddress, modules);
  if (moduleIndex < 0) {
    throw new Error("Module provided is not enabled yet");
  }
  if (moduleIndex == 0) {
    return SENTINEL_ADDRESS;
  }
  return modules[moduleIndex - 1];
}

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

  const multiSendAddress = args.multiSendContractAddress; // multiSendContract.getAddress(),

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

  //Add signature of current signer
  const transactionHash = getTransactionHash({ tx: args.tx.data }, env);

  const signature = signTransactionHash({ hash: transactionHash }, env);

  signatures.set(signerAddress, signature);

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
