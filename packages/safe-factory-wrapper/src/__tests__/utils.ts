import { ClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  Connection,
  Connections,
  ethereumPlugin,
} from "@polywrap/ethereum-plugin-js";
import { dateTimePlugin } from "polywrap-datetime-plugin";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
//import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";

export function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string
): Partial<ClientConfig> {
  return {
    redirects: [
      {
        from: "wrap://ens/safe-proxy-factory-wrapper.polywrap.eth",
        to: `wrap://ipfs/QmXxeZpXvy9T2UYcXet4caAJy2QqKAEWTXNT82rJqGA5QV`,
      },
    ],
    plugins: [
/*       {
        uri: "wrap://ens/ipfs.polywrap.eth",
        plugin: ipfsPlugin({ provider: ipfs }),
      }, */
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
        //@ts-ignore
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
