import { IWrapPackage } from "@polywrap/client-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { ClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { dateTimePlugin } from "@polywrap/datetime-plugin-js";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "polywrap";

export function configure(builder: ClientConfigBuilder): ClientConfigBuilder {
  return builder
    .addDefaults()
    .setPackages({
      "wrap://ens/wraps.eth:ethereum-provider@2.0.0": ethereumProviderPlugin({
        connections: new Connections({
          networks: {
            testnet: new Connection({
              provider: ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
            }),
          },
          defaultNetwork: "testnet",
        }),
      }) as IWrapPackage,
      "wrap://plugin/datetime": dateTimePlugin({}) as IWrapPackage,
    })
    .setRedirect(
      "wrap://ens/safe.wraps.eth:contracts@0.1.0",
      "fs/../safe-contracts-wrapper/build"
    )
}
