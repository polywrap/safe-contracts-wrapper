import path from "path";
import { ClientConfig } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { Connection, Connections, ethereumPlugin } from "@polywrap/ethereum-plugin-js";
import { dateTimePlugin } from "polywrap-datetime-plugin";
import { loggerPlugin } from "@polywrap/logger-plugin-js";
import { ethers, Signer, Wallet } from "ethers";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { defaultIpfsProviders } from "@polywrap/client-config-builder-js";
import { EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import EthersAdapter, { EthersAdapterConfig } from "@gnosis.pm/safe-ethers-lib";
import { providers } from "@polywrap/test-env-js";
import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import { abi as safeAbi_1_3_0, bytecode as safeBytecode_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";
import {
  abi as multisendAbi,
  bytecode as multisendBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import {
  abi as multisendCallOnlyAbi,
  bytecode as multisendCallOnlyBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";

import { abi as ERC20MintableAbi, bytecode as ERC20MintableBytecode } from "openzeppelin-solidity/build/contracts/ERC20Mock.json";
import * as App from "./types/wrap";
import { Client } from "@polywrap/core-js";

export const safeContractsPath = path.resolve(path.join(__dirname, "../../../safe-contracts-wrapper"));

export async function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string,
  networkName: string,
  wallet = new Wallet("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
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
                signer: wallet,
              }),
              [networkName]: new Connection({
                provider: ethereum,
                signer: wallet,
              }),
              mainnet: new Connection({ provider: "http://localhost:8546" }),
            },
            defaultNetwork: networkName,
          }),
        }),
      },
    ],
    redirects: [{ from: "wrap://ens/safe.contracts.polywrap.eth", to: `wrap://fs/${safeContractsPath}/build` }],
  };
}
const defaults = { owners: ["0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0"], threshold: 1 };
export const setupContractNetworks = async (
  client: Client,
  options?: Partial<typeof defaults>
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
  const ethereumUri = "ens/ethereum.polywrap.eth";

  const safeWrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..", "safe-factory-wrapper");
  const safeWrapperUri = `fs/${safeWrapperPath}/build`;

  let safeAddress: string;

  let proxyContractAddress: string;
  let safeContractAddress: string;
  let multisendAddress: string;
  let multisendCallOnlyAddress: string;

  const proxyFactoryContractResponse_v130 = await App.Ethereum_Module.deployContract(
    {
      abi: JSON.stringify(factoryAbi_1_3_0),
      bytecode: factoryBytecode_1_3_0,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!proxyFactoryContractResponse_v130.ok) throw proxyFactoryContractResponse_v130.error;
  proxyContractAddress = proxyFactoryContractResponse_v130.value as string;

  const safeFactoryContractResponse_v130 = await App.Ethereum_Module.deployContract(
    {
      abi: JSON.stringify(safeAbi_1_3_0),
      bytecode: safeBytecode_1_3_0,
      args: null,
    },
    client,
    ethereumUri
  );

  if (!safeFactoryContractResponse_v130.ok) throw safeFactoryContractResponse_v130.error;
  safeContractAddress = safeFactoryContractResponse_v130.value as string;

  const safeResponse = await App.SafeFactory_Module.deploySafe(
    {
      safeAccountConfig: {
        owners: safeOptions.owners!,
        threshold: safeOptions.threshold!,
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

export const getERC20Mintable = async (signer: Wallet) => {
  const provider = new ethers.providers.JsonRpcProvider(providers.ethereum);
  const wallet = new Wallet(signer.privateKey, provider);

  const factory = new ethers.ContractFactory(ERC20MintableAbi, ERC20MintableBytecode, wallet);

  const contract = await factory.deploy(signer.address, "10000000000000000000000000");

  return await contract.deployed();
};

export const getEthAdapter = async (providerUrl: string, signer: Signer): Promise<EthAdapter> => {
  const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl);

  signer = signer.connect(ethersProvider);
  const ethersAdapterConfig: EthersAdapterConfig = { ethers, signer };
  const ethAdapter = new EthersAdapter(ethersAdapterConfig);
  return ethAdapter;
};

export const setupAccounts = () => {
  return [
    {
      signer: new Wallet("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"),
      address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    },
    {
      signer: new Wallet("0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"),
      address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
    },
    { signer: new Wallet("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"), address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b" },
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
