import path from "path";
import { ClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import {
  Connection,
  Connections,
  ethereumPlugin,
} from "@polywrap/ethereum-plugin-js";
import { dateTimePlugin } from "polywrap-datetime-plugin";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { ethers, Signer, Wallet } from "ethers";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { defaultIpfsProviders } from "@polywrap/client-config-builder-js";
import { EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import EthersAdapter, { EthersAdapterConfig } from "@gnosis.pm/safe-ethers-lib";
import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

import {
  abi as multisendAbi,
  bytecode as multisendBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import {
  abi as multisendCallOnlyAbi,
  bytecode as multisendCallOnlyBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";

import * as App from "./types/wrap";
import { Client } from "@polywrap/core-js";

export async function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string,
  networkName: string
): Promise<Partial<ClientConfig>> {
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
              testnet: new Connection({
                provider: ethereum,
                signer: new Wallet(
                  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
                ),
              }),
              [networkName]: new Connection({
                provider: ethereum,
                signer: new Wallet(
                  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
                ),
              }),
              mainnet: new Connection({ provider: "http://localhost:8546" }),
            },
            defaultNetwork: "testnet",
          }),
        }),
      },
    ],
  };
}

export const setupContractNetworks = async (
  client: Client
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
  const ethereumUri = "ens/ethereum.polywrap.eth";

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

  const signer = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";

  const owner = "0xEc8E7Da193529bd8ddA13b1995F93F32989CF097";
  const owners = [signer, owner];

  const proxyFactoryContractResponse_v130 =
    await App.Ethereum_Module.deployContract(
      {
        abi: JSON.stringify(factoryAbi_1_3_0),
        bytecode: factoryBytecode_1_3_0,
        args: null,
      },
      client,
      ethereumUri
    );

  if (!proxyFactoryContractResponse_v130.ok)
    throw proxyFactoryContractResponse_v130.error;
  proxyContractAddress = proxyFactoryContractResponse_v130.value as string;

  const safeFactoryContractResponse_v130 =
    await App.Ethereum_Module.deployContract(
      {
        abi: JSON.stringify(safeAbi_1_3_0),
        bytecode: safeBytecode_1_3_0,
        args: null,
      },
      client,
      ethereumUri
    );

  if (!safeFactoryContractResponse_v130.ok)
    throw safeFactoryContractResponse_v130.error;
  safeContractAddress = safeFactoryContractResponse_v130.value as string;

  const safeResponse = await App.SafeFactory_Module.deploySafe(
    {
      safeAccountConfig: {
        owners: owners,
        threshold: 1,
      },
      txOverrides: { gasLimit: "1000000", gasPrice: "20" },
      customContractAdressess: {
        proxyFactoryContract: proxyContractAddress!,
        safeFactoryContract: safeContractAddress!,
      },
    },
    client,
    safeWrapperUri
  );

  if (!safeResponse.ok) throw safeResponse.error;
  safeAddress = safeResponse.value!.safeAddress;

  const multisendResponse = await App.Ethereum_Module.deployContract(
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

  const multisendCallOnlyResponse = await App.Ethereum_Module.deployContract(
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

export const getEthAdapter = async (
  providerUrl: string,
  signer: Signer
): Promise<EthAdapter> => {
  const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl);

  signer = signer.connect(ethersProvider);
  const ethersAdapterConfig: EthersAdapterConfig = { ethers, signer };
  const ethAdapter = new EthersAdapter(ethersAdapterConfig);
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
  ];
};

export const setupTests = async (
  chainId: string,
  contractNetworks: {
    proxyContractAddress: string;
    safeContractAddress: string;
    multisendAddress: string;
    multisendCallOnlyAddress: string;
  }
) => {
  return {
    accounts: setupAccounts(),
    contractNetworks: {
      [chainId]: {
        multiSendAddress: contractNetworks.multisendAddress,
        multiSendAbi: multisendAbi,
        multiSendCallOnlyAddress: contractNetworks.multisendCallOnlyAddress,
        multiSendCallOnlyAbi: multisendCallOnlyAbi,
        safeMasterCopyAddress: contractNetworks.safeContractAddress,
        safeMasterCopyAbi: safeAbi_1_3_0,
        safeProxyFactoryAddress: contractNetworks.proxyContractAddress,
        safeProxyFactoryAbi: factoryAbi_1_3_0,
      },
    },
  };
};
