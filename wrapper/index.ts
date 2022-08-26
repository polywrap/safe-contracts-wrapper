import {
  Ethereum_Module,
  Args_createProxy
} from "./wrap";

export function createProxy(args: Args_createProxy): bool {
  const res = Ethereum_Module.callContractMethod({
    address: args.address,
    method: "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
    // TODO: options
    args: [args.safeMasterCopyAddress, args.initializer, "1"],
    connection: args.connection,
    txOverrides: null,
  }).unwrap();

  const tx = Ethereum_Module.awaitTransaction({
    txHash: res.hash,
    confirmations: 1,
    timeout: 60000,
  }).unwrap();

  // TODO: find `ProxyCreation` event in logs
  // const logs = tx.logs;

  return true;
}
