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
        }),
        "wrap://plugin/datetime": dateTimePlugin({}) as IWrapPackage,
      })
      .addRedirect("wrap://ens/safe.wraps.eth:contracts@0.1.0", "fs/../safe-contracts-wrapper/build")
      .addRedirect("wrap://ens/ethers.wraps.eth:utils@0.1.1", "wrap://ipfs/QmaHYcvpM3mWVY7KSi4kmEKP26JhE3SWYitKCUaLfJQguy")
  );
}
