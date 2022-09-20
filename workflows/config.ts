import { ClientConfig, PolywrapClientConfig } from "@polywrap/client-js";
import { Client, PluginModule } from "@polywrap/core-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { providers, ensAddresses } from "@polywrap/test-env-js";
import { abi as abi_1_2_0, bytecode as bytecode_1_2_0 } from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafeProxyFactory.json";
import { abi as abi_1_3_0, bytecode as bytecode_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";
import { WrapManifest } from "@polywrap/wrap-manifest-types-js";

interface TestEnvironment {
  ipfs: string;
  ethereum: string;
  ensAddress: string;
  registrarAddress?: string;
  reverseAddress?: string;
  resolverAddress?: string;
}

async function getProviders(): Promise<TestEnvironment> {
  const ipfs = providers.ipfs;
  const ethereum = providers.ethereum;
  const ensAddress = ensAddresses.ensAddress;

  return { ipfs, ethereum, ensAddress };
}

function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string
): Partial<ClientConfig> {
  class AbiPlugin extends PluginModule<{}> {
    abi_1_2_0(_args: { }, _client: Client): string {
      return JSON.stringify(abi_1_2_0)
    }
    bytecode_1_2_0(_args: { }, _client: Client): string {
      return bytecode_1_2_0
    }
    abi_1_3_0(_args: { }, _client: Client): string {
      return JSON.stringify(abi_1_3_0)
    }
    bytecode_1_3_0(_args: { }, _client: Client): string {
      return bytecode_1_3_0
    }
  }
  let abiPlugin = {
    factory: () => {
      return new AbiPlugin({})
    },
    manifest: {  } as WrapManifest,
  }
  return {
    plugins: [
      {
        uri: "wrap://ens/ipfs.polywrap.eth",
        plugin: ipfsPlugin({ provider: ipfs }),
      },
      {
        uri: "wrap://ens/ens-resolver.polywrap.eth",
        plugin: ensResolverPlugin({ addresses: { testnet: ensAddress } }),
      },
      {
        uri: "wrap://ens/ethereum.polywrap.eth",
        plugin: ethereumPlugin({
          networks: {
            testnet: {
              provider: ethereum,
            },
          },
          defaultNetwork: "testnet",
        }),
      },
      {
        uri: "wrap://ens/abi.stub.eth",
        plugin: abiPlugin,
      }
    ]
  };
}

export async function getClientConfig(
  _: Partial<PolywrapClientConfig>
): Promise<Partial<PolywrapClientConfig>> {
  const { ipfs, ethereum, ensAddress } = await getProviders();
  return getPlugins(ethereum, ipfs, ensAddress);
}
