import {
  Ethereum_Module,
  Ethereum_Log,
  Args_createProxy,
  Args_proxyCreationCode,
  Args_estimateGas,
  Args_encode,
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
    txOverrides: null,
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
