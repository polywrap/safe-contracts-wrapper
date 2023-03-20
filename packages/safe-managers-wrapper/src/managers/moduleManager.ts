import {
  Args_encodeDisableModuleData,
  Args_encodeEnableModuleData,
  Args_getModules,
  Args_isModuleEnabled,
  Env,
  EthersUtils_Module,
  SafeContracts_Module,
} from "../wrap";
import {
  validateModuleAddress,
  validateModuleIsNotEnabled,
  validateModuleIsEnabledAndGetPrev,
} from "../utils/validation";


export function getModules(args: Args_getModules, env: Env): string[] {
  const result = SafeContracts_Module.getModules({
    address: env.safeAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function isModuleEnabled(args: Args_isModuleEnabled, env: Env): bool {
  const result = SafeContracts_Module.isModuleEnabled({
    address: env.safeAddress,
    moduleAddress: args.moduleAddress,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  });
  return result.unwrap();
}

export function encodeEnableModuleData(args: Args_encodeEnableModuleData, env: Env): string {
  validateModuleAddress(args.moduleAddress);
  validateModuleIsNotEnabled(args.moduleAddress, getModules({}, env));
  const result = EthersUtils_Module.encodeFunction({
    method: "function enableModule(address module) public",
    args: [args.moduleAddress],
  });
  return result.unwrap();
}

export function encodeDisableModuleData(args: Args_encodeDisableModuleData, env: Env): string {
  validateModuleAddress(args.moduleAddress);
  const prevModuleAddress = validateModuleIsEnabledAndGetPrev(args.moduleAddress, getModules({}, env));
  const result = EthersUtils_Module.encodeFunction({
    method: "function disableModule(address prevModule, address module) public",
    args: [prevModuleAddress, args.moduleAddress],
  });
  return result.unwrap();
}
