import { ClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  Connection,
  Connections,
  ethereumPlugin,
} from "@polywrap/ethereum-plugin-js";
import { dateTimePlugin } from "polywrap-datetime-plugin";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { defaultIpfsProviders } from "@polywrap/client-config-builder-js";

export function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string
): Partial<ClientConfig> {
  return {
    envs: [
      {
        uri: "wrap://ens/ipfs.polywrap.eth",
        env: {
          provider: ipfs,
          fallbackProviders: defaultIpfsProviders,
        },
      },
    ],
    plugins: [
      {
        uri: "wrap://ens/ipfs.polywrap.eth",
        plugin: ipfsPlugin({}),
      },
      {
        uri: "wrap://ens/ens.polywrap.eth",
        plugin: ensResolverPlugin({ addresses: { testnet: ensAddress } }),
      },
      {
        uri: "wrap://ens/ethereum.polywrap.eth",
        plugin: ethereumPlugin({
          connections: new Connections({
            networks: {
              testnet: new Connection({ provider: ethereum }),
            },
            defaultNetwork: "testnet",
          }),
        }),
      },
      {
        uri: "wrap://ens/datetime.polywrap.eth",
        plugin: dateTimePlugin({}),
      },
      {
        uri: "wrap://ens/js-logger.polywrap.eth",
        plugin: loggerPlugin({
          logFunc: (level, message) => {
            console.log(level, message);
            return true;
          },
        }),
      },
    ],
  };
}
