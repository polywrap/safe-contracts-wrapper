import { CoreClientConfig, IWrapPackage } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "ethereum-provider-js";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { ClientConfigBuilder, defaultIpfsProviders } from "@polywrap/client-config-builder-js";
import { ensAddresses, providers } from "@polywrap/test-env-js";

export function getClientConfig(): CoreClientConfig {
  return new ClientConfigBuilder()
    .addDefaults()
    .addEnv("wrap://package/ipfs-resolver", {
      provider: providers.ipfs,
      fallbackProviders: defaultIpfsProviders,
    })
    .addPackages({
      "wrap://ens/ens.polywrap.eth": ensResolverPlugin({ addresses: { testnet: ensAddresses.ensAddress } }),
      "wrap://ens/wraps.eth:logger@1.0.0": loggerPlugin({
        logFunc: (level, message) => {
          console.log(level, message);
          return true;
        },
      }) as IWrapPackage,
      "wrap://ens/wraps.eth:ethereum-provider@1.1.0": ethereumProviderPlugin({
        connections: new Connections({
          networks: {
            testnet: new Connection({
              provider: providers.ethereum,
            }),
          },
          defaultNetwork: "testnet",
        }),
      })
    })
    .addInterfaceImplementation("wrap://ens/wraps.eth:ethereum-provider@1.1.0", "wrap://ens/wraps.eth:ethereum-provider@1.1.0")
    .build();
}
