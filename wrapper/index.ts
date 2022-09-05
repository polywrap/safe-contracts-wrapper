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
  const res = Ethereum_Module.estimateContractCallGas({
    address: args.address,
    method: args.method,
    args: args.args,
    connection: args.connection,
    txOverrides: null,
  }).unwrap();
  return res;
}

export function proxyCreationCode(args: Args_proxyCreationCode): string {
  const res = Ethereum_Module.callContractView({
    address: args.address,
    method: "function proxyCreationCode() public pure returns (bytes memory)",
    connection: args.connection,
  }).unwrap();
  return res;
}

export function createProxy(args: Args_createProxy): string {
  const res = Ethereum_Module.callContractMethod({
    address: args.address,
    method: "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
    args: [args.safeMasterCopyAddress, args.initializer, args.saltNonce.toString()],
    connection: args.connection,
    txOverrides: null,
  }).unwrap();

  const tx = Ethereum_Module.awaitTransaction({
    txHash: res.hash,
    confirmations: 1,
    timeout: 60000,
  }).unwrap();

  const proxyCreation = "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235";
  //const data = tx.logs[0].topics[0];
  const index = tx.logs.findIndex( (log: Ethereum_Log) => log.topics[0] == proxyCreation);
  if (index == -1) {
          return "not found"
  }
  const data = tx.logs[index].data;
  const address = "0x" + tx.logs[index].data.slice(26, 66);

  return address;
}
