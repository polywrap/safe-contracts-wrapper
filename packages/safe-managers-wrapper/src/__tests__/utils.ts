import path from "path";
import {
  Connection,
  Connections,
  ethereumProviderPlugin,
} from "@polywrap/ethereum-provider-js";
import { ethers, Signer, Wallet } from "ethers";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "@polywrap/cli-js";

import {
  abi as factoryAbi_1_2_0,
  bytecode as factoryBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafeProxyFactory.json";
import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_2_0,
  bytecode as safeBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafe.json";
import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

import {
  abi as multisendAbi_1_2_0,
  bytecode as multisendBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/MultiSend.json";
import {
  abi as multisendAbi_1_3_0,
  bytecode as multisendBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import {
  abi as multisendCallOnlyAbi,
  bytecode as multisendCallOnlyBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";

import {
  abi as ERC20MintableAbi,
  bytecode as ERC20MintableBytecode,
} from "./ERC20Mock.json";
import * as App from "./types/wrap";
import {
  CoreClientConfig,
  PolywrapClient,
  IWrapPackage,
} from "@polywrap/client-js";
import { PolywrapClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { runCli } from "@polywrap/cli-js";
import { configure } from "../../client-config";

export const safeContractsPath = path.resolve(
  path.join(__dirname, "../../../safe-contracts-wrapper")
);

interface CustomizableConfig {
  signer?: Wallet;
  safeAddress?: string;
}
const connection = { networkNameOrChainId: "testnet", node: null };
export const chainId = 1337;

export function getClientConfig(
  customConfig?: CustomizableConfig
): CoreClientConfig {
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const envs: Record<string, Record<string, unknown>> = {
    "wrap://package/ipfs-resolver": {
      provider: ETH_ENS_IPFS_MODULE_CONSTANTS.ipfsProvider,
    },
  };

  if (customConfig && customConfig.safeAddress) {
    envs[wrapperUri] = {
      safeAddress: customConfig.safeAddress,
      connection,
    };
  }

  const config = configure(new PolywrapClientConfigBuilder());
  config.addEnvs(envs);

  if (customConfig && customConfig.signer) {
    config.setPackage(
      "wrap://ens/wraps.eth:ethereum-provider@2.0.0",
      ethereumProviderPlugin({
        connections: new Connections({
          networks: {
            testnet: new Connection({
              provider: ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
              signer: customConfig?.signer,
            }),
          },
          defaultNetwork: "testnet",
        }),
      }) as IWrapPackage
    );
  }

  return config.build();
}

const defaults = {
  owners: [
    "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
  ],
  threshold: 1,
};
export const setupContractNetworks = async (
  client: PolywrapClient,
  options?: Partial<typeof defaults>,
  version: "1.3.0" | "1.2.0" = "1.3.0"
): Promise<
  [
    string,
    {
      proxyContractAddress: string;
      safeContractAddress: string;
      multisendAddress: string;
      multisendCallOnlyAddress: string;
    }
  ]
> => {
  const safeOptions = { ...defaults, ...options };
  const ethereumUri = "ens/wraps.eth:ethereum@2.0.0";

  const safeWrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    "..",
    "safe-factory-wrapper"
  );
  const safeWrapperUri = `fs/${safeWrapperPath}/build`;

  let safeAddress: string;

  let proxyContractAddress: string;
  let safeContractAddress: string;
  let multisendAddress: string;
  let multisendCallOnlyAddress: string;

  const factoryAbi = version === "1.3.0" ? factoryAbi_1_3_0 : factoryAbi_1_2_0;
  const factoryBytecode =
    version === "1.3.0" ? factoryBytecode_1_3_0 : factoryBytecode_1_2_0;

  const proxyFactoryContractResponse = await App.Ethers_Module.deployContract(
    {
      abi: JSON.stringify(factoryAbi),
      bytecode: factoryBytecode,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!proxyFactoryContractResponse.ok)
    throw proxyFactoryContractResponse.error;
  proxyContractAddress = proxyFactoryContractResponse.value as string;

  const safeAbi = version === "1.3.0" ? safeAbi_1_3_0 : safeAbi_1_2_0;
  const safeBytecode =
    version === "1.3.0" ? safeBytecode_1_3_0 : safeBytecode_1_2_0;

  const safeFactoryContractResponse = await App.Ethers_Module.deployContract(
    {
      abi: JSON.stringify(safeAbi),
      bytecode: safeBytecode,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!safeFactoryContractResponse.ok) throw safeFactoryContractResponse.error;
  safeContractAddress = safeFactoryContractResponse.value as string;

  const safeResponse = await App.SafeFactory_Module.deploySafe(
    {
      input: {
        safeAccountConfig: {
          owners: safeOptions.owners!,
          threshold: safeOptions.threshold!,
        },
        safeDeploymentConfig:
          version === "1.3.0"
            ? null
            : {
                version: "1.2.0",
                saltNonce: Date.now().toString(),
                isL1Safe: null,
              },
        customContractAddresses: {
          proxyFactoryContract: proxyContractAddress!,
          safeFactoryContract: safeContractAddress!,
        },
      },
    },
    client,
    safeWrapperUri
  );

  if (!safeResponse.ok) throw safeResponse.error;
  safeAddress = safeResponse.value;

  const multisendAbi =
    version === "1.3.0" ? multisendAbi_1_3_0 : multisendAbi_1_2_0;
  const multisendBytecode =
    version === "1.3.0" ? multisendBytecode_1_3_0 : multisendBytecode_1_2_0;

  const multisendResponse = await App.Ethers_Module.deployContract(
    {
      abi: JSON.stringify(multisendAbi),
      bytecode: multisendBytecode,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!multisendResponse.ok) throw multisendResponse.error;
  multisendAddress = multisendResponse.value as string;

  const multisendCallOnlyResponse = await App.Ethers_Module.deployContract(
    {
      abi: JSON.stringify(multisendCallOnlyAbi),
      bytecode: multisendCallOnlyBytecode,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!multisendCallOnlyResponse.ok) throw multisendCallOnlyResponse.error;
  multisendCallOnlyAddress = multisendCallOnlyResponse.value as string;

  return [
    safeAddress,
    {
      proxyContractAddress,
      safeContractAddress,
      multisendAddress,
      multisendCallOnlyAddress,
    },
  ];
};

export const getERC20Mintable = async (signer: Wallet) => {
  const provider = new ethers.providers.JsonRpcProvider(
    ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider
  );
  const wallet = new Wallet(signer.privateKey, provider);

  const factory = new ethers.ContractFactory(
    ERC20MintableAbi,
    ERC20MintableBytecode,
    wallet
  );

  const contract = await factory.deploy(
    "TOKEN",
    "TOK",
    signer.address,
    "10000000000000000000000000"
  );

  return await contract.deployed();
};

export const getEthAdapter = (
  providerUrl: string,
  signer: Signer
): EthersAdapter => {
  const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl);
  signer = signer.connect(ethersProvider);
  const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });
  return ethAdapter;
};

export const setupAccounts = () => {
  return [
    {
      signer: new Wallet(
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
      ),
      address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    },
    {
      signer: new Wallet(
        "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
      ),
      address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
    },
    {
      signer: new Wallet(
        "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"
      ),
      address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
    },
  ];
};

export const setupTests = async (
  chainId: string,
  contractNetworks: {
    proxyContractAddress: string;
    safeContractAddress: string;
    multisendAddress: string;
    multisendCallOnlyAddress: string;
  },
  version: "1.3.0" | "1.2.0" = "1.3.0"
) => {
  return {
    accounts: setupAccounts(),
    contractNetworks: {
      [chainId]: {
        multiSendAddress: contractNetworks.multisendAddress,
        multiSendAbi:
          version === "1.3.0" ? multisendAbi_1_3_0 : multisendAbi_1_2_0,
        multiSendCallOnlyAddress: contractNetworks.multisendCallOnlyAddress,
        multiSendCallOnlyAbi: multisendCallOnlyAbi,
        safeMasterCopyAddress: contractNetworks.safeContractAddress,
        safeMasterCopyAbi: version === "1.3.0" ? safeAbi_1_3_0 : safeAbi_1_2_0,
        safeProxyFactoryAddress: contractNetworks.proxyContractAddress,
        safeProxyFactoryAbi:
          version === "1.3.0" ? factoryAbi_1_3_0 : factoryAbi_1_2_0,
      },
    },
  };
};

export async function initInfra(): Promise<void> {
  const { exitCode, stderr, stdout } = await runCli({
    args: ["infra", "up", "--verbose", "--modules", "eth-ens-ipfs"],
  });

  if (exitCode) {
    throw Error(
      `initInfra failed to start test environment.\nExit Code: ${exitCode}\nStdErr: ${stderr}\nStdOut: ${stdout}`
    );
  }

  await new Promise<void>(function (resolve) {
    setTimeout(() => resolve(), 5000);
  });

  return Promise.resolve();
}

export async function stopInfra(): Promise<void> {
  const { exitCode, stderr, stdout } = await runCli({
    args: ["infra", "down", "--verbose", "--modules", "eth-ens-ipfs"],
  });

  if (exitCode) {
    throw Error(
      `initInfra failed to stop test environment.\nExit Code: ${exitCode}\nStdErr: ${stderr}\nStdOut: ${stdout}`
    );
  }
  return Promise.resolve();
}
