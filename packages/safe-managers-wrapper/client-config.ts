import { IWrapPackage } from "@polywrap/client-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { IClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { providers } from "@polywrap/test-env-js";
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
        "wrap://ens/wraps.eth:ethereum-provider@2.0.0": ethereumProviderPlugin({
          connections: new Connections({
            networks: {
              testnet: new Connection({
                provider: providers.ethereum,
                signer: defaultSigner,
              }),
            },
            defaultNetwork: "testnet",
          }),
        }) as IWrapPackage,
        "wrap://ens/datetime.polywrap.eth": dateTimePlugin({}) as IWrapPackage,
      })
      .addInterfaceImplementation(
        "wrap://ens/wraps.eth:ethereum-provider@2.0.0",
        "wrap://ens/wraps.eth:ethereum-provider@2.0.0"
      )
      // @TODO(cbrzn): Remove this once the ENS text record content hash has been updated
      .addRedirect(
        "wrap://ens/wraps.eth:ethereum-utils@0.0.1",
        "wrap://ipfs/QmVNg4yFFngvtzxU49Hz1aujnwsxRbxhsGWf1iL1qwdtmN"
      )
      .addRedirect(
        "wrap://ens/safe.wraps.eth:contracts@0.0.1",
        "wrap://fs/../safe-contracts-wrapper/build"
      )
  );
}
