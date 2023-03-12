import { IWrapPackage } from "@polywrap/client-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { IClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { providers } from "@polywrap/test-env-js";
import { dateTimePlugin } from "@polywrap/datetime-plugin-js";

export function configure(builder: IClientConfigBuilder): IClientConfigBuilder {
  
  return (
    builder
      .addDefaults()
      .addPackages({
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
        "wrap://ipfs/QmVNg4yFFngvtzxU49Hz1aujnwsxRbxhsGWf1iL1qwdtmN"
      )
      .addRedirect(
        "ens/wraps.eth:ethereum@1.1.0",
        "wrap://ipfs/QmbnAG8iCdVMPQK8tQ5qqFwLKjaLF8BUuuLYiozj7mLF8Y"
      )
      .addRedirect(
        "wrap://ens/safe.wraps.eth:contracts@0.0.1",
        "fs/../safe-contracts-wrapper/build"
      )
  );
}
