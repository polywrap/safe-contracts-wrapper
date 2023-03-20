import { ClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { CoreClientConfig } from "@polywrap/core-js";
import { configure } from "../../client-config"

export function getClientConfig(): CoreClientConfig {
  return configure(new ClientConfigBuilder()).build();
}
