import { IWrapPackage } from "@polywrap/client-js";
import {
  ethereumProviderPlugin,
  Connection,
  Connections,
} from "@polywrap/ethereum-provider-js";
import { ClientConfigBuilder } from "@polywrap/client-config-builder-js";
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
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "@polywrap/cli-js";

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

export function configure(builder: ClientConfigBuilder): ClientConfigBuilder {
  return builder.addDefaults().setPackages({
    "wrap://ens/abi.stub.eth": abiPlugin as IWrapPackage,
    "wrap://ens/wraps.eth:ethereum-provider@2.0.0": ethereumProviderPlugin({
      connections: new Connections({
        networks: {
          testnet: new Connection({
            provider: ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
            signer: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
          }),
        },
        defaultNetwork: "testnet",
      }),
    }) as IWrapPackage,
  });
}
