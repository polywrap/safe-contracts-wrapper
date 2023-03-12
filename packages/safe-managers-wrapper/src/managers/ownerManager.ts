import {
  Args_encodeAddOwnerWithThresholdData,
  Args_encodeChangeThresholdData,
  Args_encodeRemoveOwnerData,
  Args_encodeSwapOwnerData,
  Args_getOwners,
  Args_getThreshold,
  Args_isOwner,
  Env,
  EthersUtils_Module,
  SafeContracts_Module,
} from "../wrap";
import { validateOwnerAddress, validateAddressIsNotOwner, validateThreshold, validateAddressIsOwnerAndGetPrev } from "../utils/validation";

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
  const result = EthersUtils_Module.encodeFunction({
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
  const result = EthersUtils_Module.encodeFunction({
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
  const result = EthersUtils_Module.encodeFunction({
    method: "function swapOwner(address prevOwner, address oldOwner, address newOwner) public",
    args: [prevOwnerAddress, args.oldOwnerAddress, args.newOwnerAddress],
  });
  return result.unwrap();
}

export function encodeChangeThresholdData(args: Args_encodeChangeThresholdData, env: Env): string {
  validateThreshold(args.threshold, getOwners({}, env).length);
  const result = EthersUtils_Module.encodeFunction({
    method: "function changeThreshold(uint256 _threshold) public",
    args: [args.threshold.toString(16)],
  });
  return result.unwrap();
}
