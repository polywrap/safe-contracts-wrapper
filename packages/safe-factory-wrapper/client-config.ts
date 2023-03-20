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
        "wrap://ens/wraps.eth:ethereum-provider@2.0.0": ethereumProviderPlugin({
          connections: new Connections({
            networks: {
              testnet: new Connection({
                provider: providers.ethereum,
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
  );
}
