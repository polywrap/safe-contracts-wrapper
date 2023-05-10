import { Env, SafeContracts_Module } from "../wrap";
import {
  Args_getAddress,
  Args_getNonce,
  Args_getContractVersion
} from "../wrap/Module/serialization";
import { BigInt, Box } from "@polywrap/wasm-as";

export function getAddress(args: Args_getAddress, env: Env): string {
  return SafeContracts_Module.getAddress({
    address: env.safeAddress,
    connection: {
      networkNameOrChainId: env.connection.networkNameOrChainId,
      node: env.connection.node,
    },
  }).unwrap();
}

export function getContractVersion(args: Args_getContractVersion, env: Env): string {
  return SafeContracts_Module.getVersion({
    address: env.safeAddress,
    connection: {
      networkNameOrChainId: env.connection.networkNameOrChainId,
      node: env.connection.node,
    },
  }).unwrap();
}

export function getNonce(args: Args_getNonce, env: Env): BigInt {
  return SafeContracts_Module.getNonce({
    address: env.safeAddress,
    connection: {
      networkNameOrChainId: env.connection.networkNameOrChainId,
      node: env.connection.node,
    },
  }).unwrap();
}

export function approvedHashes(hash: string, owner: string, env: Env): BigInt {
  return SafeContracts_Module.approvedHashes({
    address: env.safeAddress,
    hash: hash,
    ownerAddress: owner,
    connection: {
      networkNameOrChainId: env.connection.networkNameOrChainId,
      node: env.connection.node,
    },
  }).unwrap();
}
