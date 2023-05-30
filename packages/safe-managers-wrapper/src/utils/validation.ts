import { Ethers_Module } from "../wrap";
import { findIndex, sameString } from "./common";
import { SENTINEL_ADDRESS, ZERO_ADDRESS } from "./constants";

export function isZeroAddress(address: string): bool {
  return sameString(address, ZERO_ADDRESS);
}

function isSentinelAddress(address: string): bool {
  return sameString(address, SENTINEL_ADDRESS);
}

export function isRestrictedAddress(address: string): bool {
  return isZeroAddress(address) || isSentinelAddress(address);
}

export function validateOwnerAddress(ownerAddress: string): void {
  const isValidAddress = Ethers_Module.checkAddress({
    address: ownerAddress,
  });
  if (!isValidAddress || isRestrictedAddress(ownerAddress)) {
    throw new Error("Invalid owner address provided");
  }
}

export function validateAddressIsNotOwner(
  ownerAddress: string,
  owners: string[]
): void {
  const ownerIndex = findIndex(ownerAddress, owners);
  if (ownerIndex >= 0) {
    throw new Error("Address provided is already an owner");
  }
}

export function validateAddressIsOwnerAndGetPrev(
  ownerAddress: string,
  owners: string[]
): string {
  const ownerIndex = findIndex(ownerAddress, owners);
  if (ownerIndex < 0) {
    throw new Error("Address provided is not an owner");
  }
  if (ownerIndex == 0) {
    return SENTINEL_ADDRESS;
  }
  return owners[ownerIndex - 1];
}

export function validateThreshold(threshold: number, numOwners: number): void {
  if (threshold <= 0) {
    throw new Error("Threshold needs to be greater than 0");
  }
  if (threshold > numOwners) {
    throw new Error("Threshold cannot exceed owner count");
  }
}

export function validateModuleAddress(moduleAddress: string): void {
  const isValidAddress = Ethers_Module.checkAddress({
    address: moduleAddress,
  });
  if (!isValidAddress.unwrap() || isRestrictedAddress(moduleAddress)) {
    throw new Error("Invalid module address provided");
  }
}

export function validateModuleIsNotEnabled(
  moduleAddress: string,
  modules: string[]
): void {
  const moduleIndex = findIndex(moduleAddress, modules);
  if (moduleIndex >= 0) {
    throw new Error("Module provided is already enabled");
  }
}

export function validateModuleIsEnabledAndGetPrev(
  moduleAddress: string,
  modules: string[]
): string {
  const moduleIndex = findIndex(moduleAddress, modules);
  if (moduleIndex < 0) {
    throw new Error("Module provided is not enabled yet");
  }
  if (moduleIndex == 0) {
    return SENTINEL_ADDRESS;
  }
  return modules[moduleIndex - 1];
}
