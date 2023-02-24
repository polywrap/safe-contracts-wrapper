import path from "path";
import { CoreClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { Connection, Connections, ethereumProviderPlugin } from "ethereum-provider-js";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { dateTimePlugin } from "@cbrazon/datetime-plugin-js";
import { defaultIpfsProviders, ClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { ensAddresses, providers } from "@polywrap/test-env-js";
import { IWrapPackage } from "@polywrap/core-js";

export const safeContractsPath = path.resolve(path.join(__dirname, "../../safe-contracts-wrapper"));

export function getClientConfig(): CoreClientConfig {
  const ethereumWrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    "..",
    "..",
    ".."
  );

  const ethereumWrapperUri = `wrap://fs/${ethereumWrapperPath}/ethereum/wrapper/build`

  const safeWrapperUri = `wrap://fs/${safeContractsPath}/build`
  return new ClientConfigBuilder()
    .addDefaults()
    .addEnv("wrap://package/ipfs-resolver", {
      provider: providers.ipfs,
      fallbackProviders: defaultIpfsProviders,
    })
    .addPackages({
      "wrap://ens/ens.polywrap.eth": ensResolverPlugin({
        addresses: { testnet: ensAddresses.ensAddress },
      }),
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
      }),
      "wrap://ens/datetime.polywrap.eth": dateTimePlugin({}),
    })
    .addInterfaceImplementation(
      "wrap://ens/wraps.eth:ethereum-provider@1.1.0",
      "wrap://ens/wraps.eth:ethereum-provider@1.1.0"
    )
    // @TODO(cbrzn): Remove this once the ENS text record content hash has been updated
    .addRedirect(
      "ens/wraps.eth:ethereum@1.1.0",
      ethereumWrapperUri
    )
    .addRedirect(
      "wrap://ens/safe.contracts.polywrap.eth",
      safeWrapperUri
    )
    .build();
};