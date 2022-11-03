import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses,
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import {
  getPlugins,
  setupAccounts,
  setupContractNetworks,
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
//import { SafeTransaction, SafeTransactionData } from "../../wrap";

jest.setTimeout(1200000);

describe("Transactions creation", () => {
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
  /* 
  let contractNetworksPart: {
    proxyContractAddress: string;
    safeContractAddress: string;
    multisendAddress: string;
    multisendCallOnlyAddress: string;
  }; */

  const connection = { networkNameOrChainId: "testnet" };

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

    [safeAddress /* contractNetworksPart */] = await setupContractNetworks(
      client
    );

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

    it("should create a single transaction when passing a transaction array with length=1", async () => {});
    it("should create a single transaction when passing a transaction array with length=1 and options", async () => {});
    it("should fail when creating a MultiSend transaction passing a transaction array with length=0", async () => {});
    it("should create a MultiSend transaction", async () => {});
    it("should create a MultiSend transaction with options", async () => {});
  });
});
