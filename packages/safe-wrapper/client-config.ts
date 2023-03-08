import { IWrapPackage } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { IClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { ensAddresses, providers } from "@polywrap/test-env-js";
import { dateTimePlugin } from "@polywrap/datetime-plugin-js";
import { Wallet } from "ethers";

export function configure(builder: IClientConfigBuilder): IClientConfigBuilder {
  const defaultSigner = new Wallet(
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
  );
  return (
    builder
      .addDefaults()
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
                signer: defaultSigner,
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
        "wrap://ipfs/QmbnAG8iCdVMPQK8tQ5qqFwLKjaLF8BUuuLYiozj7mLF8Y"
      )
      .addRedirect(
        "wrap://ens/safe.contracts.polywrap.eth",
        "wrap://ipfs/QmRNCw1GdbuSvrzexXjpFiMaQ6WcuSNLTLXd2MuSsP6b7B"
      )
  );
}
