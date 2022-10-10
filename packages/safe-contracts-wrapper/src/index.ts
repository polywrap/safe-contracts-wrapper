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
} from "./wrap";
import { BigInt } from "@polywrap/wasm-as";

export function encode(args: Args_encode): string {
  return Ethereum_Module.encodeFunction({
    method: args.method,
    args: args.args
  }).unwrap()
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
  const index = tx.logs.findIndex( (log: Ethereum_Log) => log.topics[0] == proxyCreation_1_2_0 || log.topics[0] == proxyCreation_1_3_0);
  
  if (index == -1) {
    return null
  }
  const address = "0x" + tx.logs[index].data.slice(26, 66);

  return address;
}

export function getOwners(args: Args_getOwners): string[] {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getOwners() public view returns (address[] memory)",
    args: null,
    connection: args.connection,
  }).unwrap();

  return resp.split(",")
}

export function getThreshold(args: Args_getThreshold): u32 {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getThreshold() public view returns (uint256)",
    args: null,
    connection: args.connection
  }).unwrap();
  return u32(parseInt(resp, 10));
}

export function isOwner(args: Args_isOwner): bool {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function isOwner(address owner) public view returns (bool)",
    args: [args.ownerAddress],
    connection: args.connection
  }).unwrap();
  if (resp == "true") {
    return true
  } else {
    return false 
  }
}

export function getModules(args: Args_getModules): string[] {
  const resp = Ethereum_Module.callContractView({
    address: args.address,
    method: "function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory array, address next)",
    args: ["0x0000000000000000000000000000000000000001", "0xa"],
    connection: args.connection
  }).unwrap();
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
    connection: args.connection
  }).unwrap();
  if (resp === "true") {
    return true
  } else {
    return false 
  }
}
