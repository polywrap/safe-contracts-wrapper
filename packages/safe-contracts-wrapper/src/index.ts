import {
  Ethereum_Module,
  Ethereum_Log,
  Logger_Module,
  Args_createProxy,
  Args_proxyCreationCode,
  Args_estimateGas,
  Args_encode,
  Args_getOwners,
  Args_getThreshold,
  Args_isOwner,
  Args_getModules,
  Args_isModuleEnabled,
  Ethereum_TxReceipt,
  Interface_SafeTransaction,
  Ethereum_TxOverrides,
} from "./wrap";
import { BigInt } from "@polywrap/wasm-as";
import { JSON } from "assemblyscript-json";
import {
  Args_approvedHashes,
  Args_approveHash,
  Args_execTransaction,
  Args_getAddress,
  Args_getNonce,
  Args_getSafeContractNetworks,
  Args_getTransactionHash,
  Args_getVersion,
} from "./wrap/Module/serialization";
import { ContractNetworksConfig } from "./wrap/ContractNetworksConfig";
import {
  createTransactionFromPartial,
  encodeSignatures,
  getMultiSendCallOnlyContractAddress,
  getMultiSendContractAddress,
  getSafeContractAddress,
  getSafeFactoryContractAddress,
  getTransactionHashArgs,
} from "./utils";

export function encode(args: Args_encode): string {
  return Ethereum_Module.encodeFunction({
    method: args.method,
    args: args.args,
  }).unwrap();
}

export function estimateGas(args: Args_estimateGas): BigInt {
  return Ethereum_Module.estimateContractCallGas({
    address: args.address,
    method: args.method,
    args: args.args,
    connection: args.connection,
    txOverrides: null,
  }).unwrap();
}

export function proxyCreationCode(args: Args_proxyCreationCode): string {
  return Ethereum_Module.callContractView({
    address: args.address,
    method: "function proxyCreationCode() public pure returns (bytes memory)",
    args: [],
    connection: args.connection,
  }).unwrap();
}

export function createProxy(args: Args_createProxy): string | null {
  const tx = Ethereum_Module.callContractMethodAndWait({
    address: args.address,
    method: "function createProxyWithNonce(address,bytes memory,uint256)",
    args: [args.safeMasterCopyAddress, args.initializer, args.saltNonce.toString()],
    connection: args.connection,
    txOverrides: args.txOverrides,
  }).unwrap();

  // ProxyCreation(address)
  const proxyCreation_1_2_0 = "0xa38789425dbeee0239e16ff2d2567e31720127fbc6430758c1a4efc6aef29f80";
  // ProxyCreation(address,address)
  const proxyCreation_1_3_0 = "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235";
  const index = tx.logs.findIndex((log: Ethereum_Log) => log.topics[0] == proxyCreation_1_2_0 || log.topics[0] == proxyCreation_1_3_0);

  if (index == -1) {
    return null;
  }
  const address = "0x" + tx.logs[index].data.slice(26, 66);

  return address;
}

/*--------------
  GnosisSafeContractEthers methods
--------------*/

export function getVersion(args: Args_getVersion): string {
  const version = Ethereum_Module.callContractView({
    address: args.address,
    method: "function VERSION() public view returns (string)",
    args: [],
    connection: args.connection,
  }).unwrap();

  return version;
}

export function getAddress(args: Args_getAddress): string {
  return args.address;
}

export function getNonce(args: Args_getNonce): BigInt {
  const nonce = Ethereum_Module.callContractView({
    address: args.address,
    method: "function nonce() public view returns (uint256)",
    args: [],
    connection: args.connection,
  }).unwrap();

  return BigInt.from(nonce);
}

export function getThreshold(args: Args_getThreshold): u32 {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getThreshold() public view returns (uint256)",
    args: null,
    connection: args.connection,
  }).unwrap();
  return u32(parseInt(resp, 10));
}

export function getOwners(args: Args_getOwners): string[] {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getOwners() public view returns (address[] memory)",
    args: null,
    connection: args.connection,
  }).unwrap();

  const v = JSON.parse(resp);
  if (!v.isArr) {
    throw new Error("ethereum value is not array: " + v.stringify());
  }
  const arr = (v as JSON.Arr).valueOf();
  const result: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    let s = arr[i];
    if (!s.isString) {
      throw new Error("ethereum value element is not string: " + s.stringify());
    }
    result.push((s as JSON.Str).valueOf());
  }
  return result;
}

export function isOwner(args: Args_isOwner): bool {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function isOwner(address owner) public view returns (bool)",
    args: [args.ownerAddress],
    connection: args.connection,
  }).unwrap();
  if (resp == "true") {
    return true;
  } else {
    return false;
  }
}

export function getTransactionHash(args: Args_getTransactionHash): string {
  const recreatedTx = createTransactionFromPartial(args.safeTransactionData, null);

  const contractArgs = getTransactionHashArgs(recreatedTx);

  const res = Ethereum_Module.callContractView({
    address: args.safeAddress,
    method:
      "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
    args: contractArgs,
    connection: args.connection,
  }).unwrap();

  return res;
}

export function approvedHashes(args: Args_approvedHashes): BigInt {
  const result = Ethereum_Module.callContractView({
    address: args.address,
    method: "function approvedHashes(address owner, bytes32 hash) public view returns (uint256)",
    args: [args.ownerAddress, args.hash],
    connection: args.connection,
  }).unwrap();
  return BigInt.from(result);
}

export function approveHash(args: Args_approveHash): Ethereum_TxReceipt {
  const signerAddress = Ethereum_Module.getSignerAddress({ connection: args.connection }).unwrap();

  const addressIsOwner = isOwner({ address: args.safeAddress, ownerAddress: signerAddress, connection: args.connection });

  if (!addressIsOwner) {
    throw new Error("Transaction hashes can only be approved by Safe owners");
  }

  if (args.options != null && args.options!.gasPrice && args.options!.gasLimit) {
    throw new Error("Cannot specify gas and gasLimit together in transaction options");
  }

  if (args.options != null && !args.options!.gasLimit) {
    args.options!.gasLimit = estimateGas({
      address: args.safeAddress,
      method: "function approveHash(bytes32 hashToApprove) external",
      args: [args.hash],
      connection: args.connection,
    });
  }

  const response = Ethereum_Module.callContractMethodAndWait({
    method: "function approveHash(bytes32 hashToApprove) external",
    address: args.safeAddress,
    args: [args.hash],
    connection: args.connection,
    txOverrides: {
      gasLimit: args.options ? args.options!.gasLimit : null,
      gasPrice: args.options ? args.options!.gasPrice : null,
      value: null,
    },
  }).unwrap();

  return response;
}

export function getModules(args: Args_getModules): string[] {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory array, address next)",
    args: ["0x0000000000000000000000000000000000000001", "0xa"],
    connection: args.connection,
  }).unwrap();
  // TODO; rewrite to json
  const comma = resp.lastIndexOf(",");
  const arr = resp.substring(0, comma);
  if (arr.includes(",")) {
    return arr.split(",");
  } else {
    return [];
  }
}

export function isModuleEnabled(args: Args_isModuleEnabled): bool {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function isModuleEnabled(address module) public view returns (bool)",
    args: [args.moduleAddress],
    connection: args.connection,
  }).unwrap();
  if (resp === "true") {
    return true;
  } else {
    return false;
  }
}

export function execTransaction(args: Args_execTransaction): Ethereum_TxReceipt {
  const txData = args.safeTransaction.data;
  const txSignatures = args.safeTransaction.signatures!;

  const txOverrides: Ethereum_TxOverrides = {
    gasLimit: args.txOverrides != null ? args.txOverrides!.gasLimit : null,
    gasPrice: args.txOverrides != null ? args.txOverrides!.gasPrice : null,
    value: args.txOverrides != null ? args.txOverrides!.value : null,
  };

  const method =
    "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) external payable returns (bool success)";

  const encodedSignatures = encodeSignatures(txSignatures);
  if (!txOverrides.gasLimit) {
    const estimationArgs = getTransactionHashArgs(txData);
    estimationArgs.pop();
    estimationArgs.push(encodedSignatures);

    txOverrides.gasLimit = estimateGas({
      address: args.safeAddress,
      method:
        "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures)",
      args: estimationArgs,
      connection: args.connection,
    });
  }

  return Ethereum_Module.callContractMethodAndWait({
    address: args.safeAddress,
    method: method,
    args: [
      txData.to,
      txData.value.toString(),
      txData.data,
      txData.operation!.toString(),
      txData.safeTxGas!.toString(),
      txData.baseGas!.toString(),
      txData.gasPrice!.toString(),
      txData.gasToken!,
      txData.refundReceiver!,
      encodedSignatures,
    ],
    txOverrides: txOverrides,
    connection: args.connection,
  }).unwrap();
}

export function getSafeContractNetworks(args: Args_getSafeContractNetworks): ContractNetworksConfig {
  const safeContractVersion = args.version;
  const chainId = args.chainId;
  const isL1Safe: bool = args.isL1Safe != null ? args.isL1Safe!.unwrap() : false;

  return {
    multiSendAddress: getMultiSendContractAddress(safeContractVersion, chainId.toString()),
    multiSendCallOnlyAddress: getMultiSendCallOnlyContractAddress(safeContractVersion, chainId.toString()),
    safeMasterCopyAddress: getSafeContractAddress(safeContractVersion, chainId.toString(), !isL1Safe),
    safeProxyFactoryAddress: getSafeFactoryContractAddress(safeContractVersion, chainId.toString()),
  };
}
