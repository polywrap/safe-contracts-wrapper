import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import {
  getEthAdapter,
  getPlugins,
  setupAccounts,
  setupContractNetworks,
  setupTests,
  // setupTests,
} from "../utils";
/* import Safe from "@gnosis.pm/safe-core-sdk";
import {
  SafeTransactionDataPartial,
  EthAdapter,
} from "@gnosis.pm/safe-core-sdk-types";
import EthersAdapter, { EthersAdapterConfig } from "@gnosis.pm/safe-ethers-lib";
import { ethers, Wallet } from "ethers";
import { Signer } from "@ethersproject/abstract-signer";
 */
//import { abi as factoryAbi_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

//import { abi as safeAbi_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

//import { abi as multisendAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

//import { abi as multisendCallOnlyAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
//import { SafeWrapper_SafeTransaction } from "../types/wrap";
import { Client } from "@polywrap/core-js";
//@ts-ignore
import { zeroAddress } from "ethereumjs-util";
import { SafeWrapper_SafeTransactionData } from "../types/wrap";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionData } from "../../wrap";
//import { SafeTransaction, SafeTransactionData } from "../../wrap";

jest.setTimeout(1200000);

describe("Transactions creation", () => {
  //const ethereumUri = "ens/ethereum.polywrap.eth";
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

  let contractNetworksPart: {
    proxyContractAddress: string;
    safeContractAddress: string;
    multisendAddress: string;
    multisendCallOnlyAddress: string;
  };

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };

  beforeAll(async () => {
    await initTestEnvironment();

    const plugins = await getPlugins(
      providers.ethereum,
      providers.ipfs,
      ensAddresses.ensAddress,
      connection.networkNameOrChainId
    );

    client = new PolywrapClient({
      ...plugins,
    }) as unknown as Client;

    [safeAddress, contractNetworksPart] = await setupContractNetworks(client);

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

  describe("standardizeSafeTransactionData", () => {});

  describe("createTransaction", () => {
    it("should create a single transaction with gasPrice=0", async () => {
      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
        baseGas: "111",
        gasPrice: "0",
        gasToken: "0x333",
        refundReceiver: "0x444",
        nonce: "555",
        safeTxGas: "666",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      expect(transactionResult.ok).toEqual(true);
      //@ts-ignore
      const transaction = transactionResult.value.data;

      expect(transaction).toMatchObject(transactionData);
    });

    it("should create a single transaction with gasPrice>0", async () => {
      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
        baseGas: "111",
        gasPrice: "222",
        gasToken: "0x333",
        refundReceiver: "0x444",
        nonce: "555",
        safeTxGas: "666",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      expect(transactionResult.ok).toEqual(true);
      //@ts-ignore
      const transaction = transactionResult.value.data;

      expect(transaction).toMatchObject(transactionData);
    });

    it.only("should create a single transaction when passing a transaction array with length=1", async () => {
      const { accounts, contractNetworks } = await setupTests(connection.chainId.toString(), contractNetworksPart);
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(providers.ethereum, account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });
      const safeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x00",
        baseGas: 111,
        gasPrice: 453,
        gasToken: "0x333",
        refundReceiver: "0x444",
        safeTxGas: 2, //TODO find out why created from sdk transaction transforms this value to 0
        operation: 1,
        nonce: 1,
      };
      const safeTransactionDataWrapper = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x00",
        baseGas: "111",
        gasPrice: "453",
        gasToken: "0x333",
        refundReceiver: "0x444",
        safeTxGas: "2", //TODO find out why created from sdk transaction transforms this value to 0
        operation: "1",
        nonce: "1",
      };
      const safeTxArray = [safeTransactionData, safeTransactionData];

      const sdkMultisend = await safeSdk.createTransaction({
        safeTransactionData: safeTxArray,
      });
      const wrapperMultisendResult = await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: [safeTransactionDataWrapper, safeTransactionDataWrapper],
          multiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const wrapperMultisendData = wrapperMultisendResult.value.data as SafeTransactionData;
      const sdkMultisendData = sdkMultisend.data;

      console.log("sdkMultisend", sdkMultisend);
      console.log("wrapperMultisendData", wrapperMultisendData);

      expect(wrapperMultisendData.to).toEqual(sdkMultisendData.to);
      expect(wrapperMultisendData.value).toEqual(sdkMultisendData.value);
      expect(wrapperMultisendData.data).toEqual(sdkMultisendData.data);
      expect(wrapperMultisendData.baseGas).toEqual(sdkMultisendData.baseGas.toString());
      expect(wrapperMultisendData.gasPrice).toEqual(sdkMultisendData.gasPrice.toString());
      expect(wrapperMultisendData.gasToken).toEqual(sdkMultisendData.gasToken);
      expect(wrapperMultisendData.refundReceiver).toEqual(sdkMultisendData.refundReceiver);
      expect(wrapperMultisendData.nonce).toEqual(sdkMultisendData.nonce.toString());
      expect(wrapperMultisendData.safeTxGas).toEqual(sdkMultisendData.safeTxGas.toString());
    });
    it("should create a single transaction when passing a transaction array with length=1 and options", async () => {});
    it("should fail when creating a MultiSend transaction passing a transaction array with length=0", async () => {});
    it("should create a MultiSend transaction", async () => {});
    it("should create a MultiSend transaction with options", async () => {});
  });
});
