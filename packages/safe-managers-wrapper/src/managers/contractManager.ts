import { Env, SafeContracts_Module } from "../wrap";
import {
  Args_getAddress,
  Args_getNonce,
  Args_getContractVersion,
  Args_getMultiSendAddress,
  Args_getMultiSendCallOnlyAddress,
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

export function getMultiSendAddress(args: Args_getMultiSendAddress, env: Env): string {
  const version = getContractVersion({}, env);

  const contractNetworks = SafeContracts_Module.getSafeContractNetworks({
    version: version,
    chainId: env.connection.networkNameOrChainId!,
    isL1Safe: Box.from(false),
    filter: {
      multiSendAddress: true,
      multiSendCallOnlyAddress: false,
      safeMasterCopyAddress: false,
      safeProxyFactoryAddress: false,
      fallbackHandlerAddress: false
    }
  }).unwrap()!;

  return contractNetworks.multiSendAddress!;
}

export function getMultiSendCallOnlyAddress(args: Args_getMultiSendCallOnlyAddress, env: Env): string {
  const version = getContractVersion({}, env);

  const contractNetworks = SafeContracts_Module.getSafeContractNetworks({
    version: version,
    chainId: env.connection.networkNameOrChainId!,
    isL1Safe: Box.from(false),
    filter: {
      multiSendAddress: false,
      multiSendCallOnlyAddress: true,
      safeMasterCopyAddress: false,
      safeProxyFactoryAddress: false,
      fallbackHandlerAddress: false
    }
  }).unwrap()!;

  return contractNetworks.multiSendCallOnlyAddress!;
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
