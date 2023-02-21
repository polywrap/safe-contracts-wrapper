import {
  IWrapPackage,
  IClientConfigBuilder,
  defaultIpfsProviders,
} from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "ethereum-provider-js";
import { providers, ensAddresses } from "@polywrap/test-env-js";
import {
  abi as abi_1_2_0,
  bytecode as bytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafeProxyFactory.json";
import {
  abi as abi_1_3_0,
  bytecode as bytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";
import { WrapManifest } from "@polywrap/wrap-manifest-types-js";
import { PluginPackage, PluginModule } from "@polywrap/plugin-js";
import { loggerPlugin } from "@polywrap/logger-plugin-js";

type NoConfig = Record<string, never>;
class AbiPlugin extends PluginModule<NoConfig> {
  abi_1_2_0(_args: {}): string {
    return JSON.stringify(abi_1_2_0);
  }
  bytecode_1_2_0(_args: {}): string {
    return bytecode_1_2_0;
  }
  abi_1_3_0(_args: {}): string {
    return JSON.stringify(abi_1_3_0);
  }
  bytecode_1_3_0(_args: {}): string {
    return bytecode_1_3_0;
  }
}

let abiPlugin = PluginPackage.from(new AbiPlugin({}), {} as WrapManifest);

export function configure(builder: IClientConfigBuilder): IClientConfigBuilder {
  return builder
    .addDefaults()
    .addEnv("wrap://package/ipfs-resolver", {
      provider: providers.ipfs,
      fallbackProviders: defaultIpfsProviders,
    })
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
            }),
          },
          defaultNetwork: "testnet",
        }),
      }),
      "wrap://ens/abi.stub.eth": abiPlugin,
    })
    .addInterfaceImplementation(
      "wrap://ens/wraps.eth:ethereum-provider@1.1.0",
      "wrap://ens/wraps.eth:ethereum-provider@1.1.0"
    )
    .addRedirect(
      "ens/wraps.eth:ethereum@1.1.0",
      "ipfs/QmZJqVyqHZsiRrLJ5mLUEJAFSsPkrPGHxT4EUksFMaJP3g"
    );
}
