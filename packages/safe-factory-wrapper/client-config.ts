import { IWrapPackage } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "ethereum-provider-js";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import {
  defaultIpfsProviders,
  IClientConfigBuilder,
} from "@polywrap/client-config-builder-js";
import { ensAddresses, providers } from "@polywrap/test-env-js";
import { dateTimePlugin } from "@cbrazon/datetime-plugin-js";

export function configure(builder: IClientConfigBuilder): IClientConfigBuilder {
  return (
    builder
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
        "wrap://ens/datetime.polywrap.eth": dateTimePlugin({}) as IWrapPackage,
      })
      .addInterfaceImplementation(
        "wrap://ens/wraps.eth:ethereum-provider@1.1.0",
        "wrap://ens/wraps.eth:ethereum-provider@1.1.0"
      )
      // @TODO(cbrzn): Remove this once the ENS text record content hash has been updated
      .addRedirect(
        "wrap://ens/wraps.eth:ethereum-utils@0.0.1",
        "wrap://ipfs/QmcqHPQoYfBYjZtofK1beazZDubhnJ9dgxdAGxjuaJyYC3"
      )
      .addRedirect(
        "ens/wraps.eth:ethereum@1.1.0",
        "wrap://ipfs/QmW1kThCxuvpUCrSKpR7PFvaBhe4PK5sqbf4LWhb8uErKW"
      )
      .addRedirect(
        "wrap://ens/safe.contracts.polywrap.eth",
        "wrap://ipfs/QmRNCw1GdbuSvrzexXjpFiMaQ6WcuSNLTLXd2MuSsP6b7B"
      )
  );
}
