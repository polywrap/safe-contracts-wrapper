import gnosis_safe_v100 from "./1.0.0/gnosis_safe";
import gnosis_safe_v111 from "./1.1.1/gnosis_safe";
import gnosis_safe_v120 from "./1.2.0/gnosis_safe";
import gnosis_safe_v130 from "./1.3.0/gnosis_safe";
import gnosis_safe_v130_l2 from "./1.3.0/gnosis_safe_l2";
import proxy_factory_v111 from "./1.1.1/proxy_factory";
import proxy_factory_v130 from "./1.3.0/proxy_factory";
import multi_send_v111 from "./1.1.1/multi_send";
import multi_send_v130 from "./1.3.0/multi_send";
import multi_send_call_only_v130 from "./1.3.0/multi_send_call_only";
import compatibility_fallback_handler from "./1.3.0/compatibility_fallback_handler";

//https://github.com/safe-global/safe-deployments/tree/main/src/assets - contract adressess

function generateMap<K = string, V = string>(values: string[][]): Map<K, V> {
  const map = new Map<K, V>();

  for (let i = 0; i < values.length; i++) {
    const key = <K>values[i][0];
    const value = <V>values[i][1];
    map.set(key, value);
  }
  return map;
}

export function getSafeContractMap(
  version: string,
  isL2: boolean = false
): Map<string, string> {
  if (version == "1.3.0") {
    if (isL2) {
      return generateMap(gnosis_safe_v130_l2);
    } else {
      return generateMap(gnosis_safe_v130);
    }
  } else if (version == "1.2.0") {
    return generateMap(gnosis_safe_v120);
  } else if (version == "1.1.1") {
    return generateMap(gnosis_safe_v111);
  } else if (version == "1.0.0") {
    return generateMap(gnosis_safe_v100);
  } else {
    throw new Error("Invalid Safe version");
  }
}

export function getSafeFactoryContractMap(
  version: string
): Map<string, string> {
  if (version == "1.3.0") {
    return generateMap(proxy_factory_v130);
  } else if (version == "1.2.0" || version == "1.1.1") {
    return generateMap(proxy_factory_v111);
  } else {
    throw new Error("Invalid Safe version");
  }
}

export function getMultisendContractMap(version: string): Map<string, string> {
  if (version == "1.3.0") {
    return generateMap(multi_send_v130);
  } else if (version == "1.2.0" || version == "1.1.1") {
    return generateMap(multi_send_v111);
  } else {
    throw new Error("Invalid Safe version");
  }
}
export function getMultisendCallOnlyContractMap(
  version: string
): Map<string, string> {
  if (version == "1.3.0" || version == "1.2.0" || version == "1.1.1") {
    return generateMap(multi_send_call_only_v130);
  } else {
    throw new Error("Invalid Safe version");
  }
}

export function getFallbackHandlerCompabilityMap(
  version: string
): Map<string, string> {
  if (version == "1.3.0") {
    return generateMap(compatibility_fallback_handler);
  } else {
    return new Map()
  }
}