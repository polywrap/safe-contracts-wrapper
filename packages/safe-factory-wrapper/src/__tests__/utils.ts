import path from "path";
import { ClientConfigBuilder, CoreClientConfig } from "@polywrap/client-js";
import { configure } from "../../client-config";

export const safeContractsPath = path.resolve(path.join(__dirname, "../../../safe-contracts-wrapper"));

export function getClientConfig(): CoreClientConfig {
  return configure(new ClientConfigBuilder()).build();
};