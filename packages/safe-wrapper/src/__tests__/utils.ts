import { ClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { Connection, Connections, ethereumPlugin } from "@polywrap/ethereum-plugin-js";
import { dateTimePlugin } from "polywrap-datetime-plugin";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { Wallet } from "ethers";

export function getPlugins(
  ethereum: string,
  ensAddress: string,
  network: string,
): Partial<ClientConfig> {
  return {
    redirects: [
      {
        from: "wrap://ens/safe-proxy-factory-wrapper.polywrap.eth",
        to: `wrap://ipfs/QmTyaVrUsM5P9kLyK2uJ2Uvohgk2A7QSXe9M22mfaeX42D`,
      },
      {
        from: "wrap://ens/safefactory.eth",
        to: "wrap://ipfs/QmPajKxGQZwU1PW22dSEKq8eLHhmRs7rsDVraC8S1gfxda",
      }
    ],
    plugins: [
      /*{
        uri: "wrap://ens/ipfs.polywrap.eth",
        plugin: ipfsPlugin({ provider: ipfs }),
      },*/
      {
        uri: "wrap://ens/ens.polywrap.eth",
        plugin: ensResolverPlugin({ addresses: { testnet: ensAddress } }),
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
      {
        uri: "wrap://ens/ethereum.polywrap.eth",
        plugin: ethereumPlugin({
          connections: new Connections({
            networks: {
              [network]: new Connection({
                provider: `https://${network}.infura.io/v3/9d16956e670e4429b9fc821128eb259c`, // ethereum,
                signer: new Wallet(
                  "8ca435f1321b8043d984d95776cf53f570f2e296f86a8b0c9ddbd7c537cee6a2"
                ),
              }),
              testnet: new Connection({ provider: ethereum }),
            },
            defaultNetwork: network,
          }),
        }),
      }
    ],
  };
}
