import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses,
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupContractNetworks } from "../utils";
import Safe from "@gnosis.pm/safe-core-sdk";
import {
  SafeTransactionDataPartial,
  EthAdapter,
} from "@gnosis.pm/safe-core-sdk-types";
import EthersAdapter, { EthersAdapterConfig } from "@gnosis.pm/safe-ethers-lib";
import { ethers, Wallet } from "ethers";
import { Signer } from "@ethersproject/abstract-signer";

import { abi as factoryAbi_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import { abi as safeAbi_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

import { abi as multisendAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import { abi as multisendCallOnlyAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
//import { SafeWrapper_SafeTransaction } from "../types/wrap";
import { Client } from "@polywrap/core-js";
//@ts-ignore
import { bufferToHex, ecrecover, pubToAddress } from "ethereumjs-util";

jest.setTimeout(1200000);

describe("Safe Wrapper", () => {
  const wallet = new Wallet(
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
  );

  const signer = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";

  //const ethereumUri = "ens/ethereum.polywrap.eth";
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  let proxyContractAddress: string;
  let safeContractAddress: string;
  let multisendAddress: string;
  let multisendCallOnlyAddress: string;

  const ethersProvider = new ethers.providers.JsonRpcProvider(
    providers.ethereum
  );

  const connection = { networkNameOrChainId: "testnet" };

  beforeAll(async () => {
    await initTestEnvironment();

    const network = await ethersProvider.getNetwork();

    connection.networkNameOrChainId = network.chainId.toString();

    const plugins = await getPlugins(
      providers.ethereum,
      providers.ipfs,
      ensAddresses.ensAddress,
      ethersProvider
    );

    client = new PolywrapClient({
      ...plugins,
    }) as unknown as Client;

    [
      safeAddress,
      {
        proxyContractAddress,
        safeContractAddress,
        multisendAddress,
        multisendAddress,
      },
    ] = await setupContractNetworks(client);

    client = new PolywrapClient({
      ...plugins,
      envs: [
        {
          uri: wrapperUri,
          env: {
            safeAddress: safeAddress,
            connection: connection,
          },
        },
      ],
    }) as unknown as Client;
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  describe.only("SignTransaction", () => {
    const setupTests = async () => {
      return {
        accounts: [
          {
            signer: wallet,
            address: signer,
          },
        ],
        contractNetworks: {
          [(await ethersProvider.getNetwork()).chainId]: {
            multiSendAddress: multisendAddress,
            multiSendAbi: multisendAbi,
            multiSendCallOnlyAddress: multisendCallOnlyAddress,
            multiSendCallOnlyAbi: multisendCallOnlyAbi,
            safeMasterCopyAddress: safeContractAddress,
            safeMasterCopyAbi: safeAbi_1_3_0,
            safeProxyFactoryAddress: proxyContractAddress,
            safeProxyFactoryAbi: factoryAbi_1_3_0,
          },
        },
      };
    };

    const getEthAdapter = async (signer: Signer): Promise<EthAdapter> => {
      let ethAdapter: EthAdapter;
      signer = signer.connect(ethersProvider);
      const ethersAdapterConfig: EthersAdapterConfig = { ethers, signer };
      ethAdapter = new EthersAdapter(ethersAdapterConfig);
      return ethAdapter;
    };

    it("Should create SDK-like transaction based on full transaction data ", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;
      const ethAdapter = await getEthAdapter(account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = (await ethAdapter.getNonce(account1.address)) + 1;

      const safeTransactionData: SafeTransactionDataPartial = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
        baseGas: 111,
        gasPrice: 453,
        gasToken: "0x333",
        refundReceiver: "0x444",
        safeTxGas: 0, //TODO find out why created from sdk transaction transforms this value to 0
        operation: 0,
      };

      const sdkTx = await safeSdk.createTransaction({
        safeTransactionData: { ...safeTransactionData, nonce: nonce },
      });

      const wrapperTxResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: {
            ...safeTransactionData,
            safeTxGas: safeTransactionData.safeTxGas,
            baseGas: safeTransactionData.baseGas,
            gasPrice: safeTransactionData.gasPrice,
            nonce: nonce,
          },
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const wrapperTx = wrapperTxResult.value;

      expect(wrapperTx).toEqual(sdkTx);
    });

    it("Should return transaction hash SDK-like", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;
      const ethAdapter = await getEthAdapter(account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = await ethAdapter.getNonce(account1.address);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: {
          data: "0x",
          value: "50000",
          to: account1.address,
          nonce: nonce + 1,
        },
      });

      const { baseGas, gasPrice, nonce: txNonce, safeTxGas } = tx.data;

      const sdkHash = await safeSdk.getTransactionHash(tx);

      const wrapperHashResult = await App.SafeWrapper_Module.getTransactionHash(
        {
          tx: {
            ...tx.data,
            safeTxGas: safeTxGas,
            baseGas: baseGas,
            gasPrice: gasPrice,
            nonce: txNonce,
          },
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const wrapperHash = wrapperHashResult.value as string;

      //console.log("sdkHash:", sdkHash);
      //console.log("wrapperHash", wrapperHash);

      expect(wrapperHash).toEqual(sdkHash);
    });

    it("Should sign transaction hash SDK-like", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = await ethAdapter.getNonce(account1.address);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: {
          data: "0x",
          value: "50000",
          to: account1.address,
          nonce: nonce + 1,
        },
      });

      const txHash = await safeSdk.getTransactionHash(tx);
      //console.log("txHash: ", txHash);

      const wrapperSignedResult =
        await App.SafeWrapper_Module.signTransactionHash(
          { hash: txHash },
          client,
          wrapperUri
        );

      !wrapperSignedResult.ok && console.log();

      //@ts-ignore
      const wrapperSigned = wrapperSignedResult.value;
      //console.log("wrapperAdjustedSignature", wrapperSigned);

      const sdkSigned = await safeSdk.signTransactionHash(txHash);
      //console.log("sdkSigned", sdkSigned);

      expect(wrapperSigned).toEqual(sdkSigned);
    });
  });
});
