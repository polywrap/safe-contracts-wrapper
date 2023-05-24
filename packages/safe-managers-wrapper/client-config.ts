import { IWrapPackage } from "@polywrap/client-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { IClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { dateTimePlugin } from "@polywrap/datetime-plugin-js";
import { Wallet } from "ethers";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "@polywrap/cli-js";

export function configure(builder: IClientConfigBuilder): IClientConfigBuilder {
  const defaultSigner = new Wallet(
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
  );
  return builder
    .addDefaults()
    .addPackages({
      "wrap://ens/wraps.eth:ethereum-provider@2.0.0": ethereumProviderPlugin({
        connections: new Connections({
          networks: {
            testnet: new Connection({
              provider: ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
              signer: defaultSigner,
            }),
          },
          defaultNetwork: "testnet",
        }),
      }) as IWrapPackage,
      "wrap://plugin/datetime": dateTimePlugin({}) as IWrapPackage,
    })
    .addRedirect(
      "wrap://ens/safe.wraps.eth:contracts@0.1.0",
      "fs/../safe-contracts-wrapper/build"
    )
    .addRedirect(
      "wrap://ens/ethers.wraps.eth:utils@0.1.1",
      "wrap://ipfs/QmaHYcvpM3mWVY7KSi4kmEKP26JhE3SWYitKCUaLfJQguy"
    );
}
