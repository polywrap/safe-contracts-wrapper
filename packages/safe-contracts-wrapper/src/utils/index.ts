import {
  getFallbackHandlerCompabilityMap,
  getMultisendCallOnlyContractMap,
  getMultisendContractMap,
  getSafeContractMap,
  getSafeFactoryContractMap,
} from "./contractAddresses";
export * from './transaction'

export const ZERO_ADDRESS = `0x${"0".repeat(40)}`;
export const EMPTY_DATA = "0x";

export function getSafeContractAddress(safeVersion: string, chainId: string, isL2: boolean = false): string {
  const safeContractMap = getSafeContractMap(safeVersion, isL2);

  const hasContractAddress = safeContractMap.has(chainId);

  if (hasContractAddress) {
    const contractAddress = safeContractMap.get(chainId);
    return <string>contractAddress;
  } else {
    throw new Error("No safe contract for provided chainId");
  }
}

export function getSafeFactoryContractAddress(safeVersion: string, chainId: string): string {
  const safeFactoryContractMap = getSafeFactoryContractMap(safeVersion);

  const hasContractAddress = safeFactoryContractMap.has(chainId);
  if (hasContractAddress) {
    const contractAddress = safeFactoryContractMap.get(chainId);
    return <string>contractAddress;
  } else {
    throw new Error("No factory contract for provided chainId");
  }
}

export function getMultiSendContractAddress(safeVersion: string, chainId: string): string | null {
  const multiSendContractMap = getMultisendContractMap(safeVersion);

  const hasMultisendContractAddress = multiSendContractMap.has(chainId);
  if (hasMultisendContractAddress) {
    return <string>multiSendContractMap.get(chainId);
  } else {
    return null;
  }
}

export function getMultiSendCallOnlyContractAddress(safeVersion: string, chainId: string): string | null {
  const multiSendContractMap = getMultisendCallOnlyContractMap(safeVersion);

  const hasMultisendContractAddress = multiSendContractMap.has(chainId);
  if (hasMultisendContractAddress) {
    return <string>multiSendContractMap.get(chainId);
  } else {
    return null;
  }
}

export function getFallbackHandlerCompability(
  safeVersion: string,
  chainId: string
): string | null {
  const fallbackHandlerMap = getFallbackHandlerCompabilityMap(safeVersion);

  const hasFallbackHandler = fallbackHandlerMap.has(chainId);
  if (hasFallbackHandler) {
    return <string>fallbackHandlerMap.get(chainId);
  } else {
    return null;
  }
}
