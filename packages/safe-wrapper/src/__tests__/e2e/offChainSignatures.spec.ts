import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupAccounts, setupContractNetworks } from "../utils";
import { Client } from "@polywrap/core-js";
import { SafeWrapper_SafeTransaction, SafeWrapper_SafeTransactionData } from "../types/wrap";
import { SignSignature } from "../../wrap";
import { Wallet } from "ethers";

jest.setTimeout(1200000);

describe("Off-chain signatures", () => {
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

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

    [safeAddress] = await setupContractNetworks(client);

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

  describe("signTransactionHash", () => {
    it("should sign a transaction hash with the current signer", async () => {
      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const tx = transactionResult.value as SafeWrapper_SafeTransaction;

      expect(tx).toBeTruthy();

      const transactionHashResult = await App.SafeWrapper_Module.getTransactionHash(
        { tx: tx.data },
        client,
        wrapperUri
      );

      //@ts-ignore
      const hash = transactionHashResult.value as string;

      expect(hash).toBeTruthy();

      const signatureResult = await App.SafeWrapper_Module.signTransactionHash({ hash: hash }, client, wrapperUri);

      //@ts-ignore
      const signature = signatureResult.value as SignSignature;

      expect(signature).toBeTruthy();
      expect(signature.data.length).toEqual(132);
    });
  });

  describe("signTransaction", () => {
    it("should add the signature of the current signer", async () => {
      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const tx = transactionResult.value as SafeWrapper_SafeTransaction;

      expect(tx).toBeTruthy();
      expect(tx.signatures?.size).toEqual(0);

      const signedTransactionResult = await App.SafeWrapper_Module.addSignature({ tx: tx }, client, wrapperUri);

      //@ts-ignore
      const signedTransaction = signedTransactionResult.value as SafeWrapper_SafeTransaction;

      expect(signedTransaction).toBeTruthy();

      //@ts-ignore
      const signatures = signedTransaction.signatures as Map<string, SignSignature>;

      expect(signatures.size).toEqual(1);
    });
    it("should ignore duplicated signatures", async () => {
      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const tx = transactionResult.value as SafeWrapper_SafeTransaction;

      expect(tx).toBeTruthy();
      expect(tx.signatures?.size).toEqual(0);

      const signedTransactionResult = await App.SafeWrapper_Module.addSignature({ tx: tx }, client, wrapperUri);

      //@ts-ignore
      const signedTx = signedTransactionResult.value as SafeWrapper_SafeTransaction;

      expect(signedTx).toBeTruthy();

      expect(signedTx.signatures?.size).toEqual(1);

      //Try to sign second time
      const signedTransactionResult2 = await App.SafeWrapper_Module.addSignature({ tx: signedTx }, client, wrapperUri);

      //@ts-ignore
      const signedTx2 = signedTransactionResult2.value as SafeWrapper_SafeTransaction;

      expect(signedTx2.signatures?.size).toEqual(1);
    });

    it("should fail if signature is added by an account that is not an owner", async () => {
      //recreating client with new signer
      client = new PolywrapClient({
        ...(await getPlugins(
          providers.ethereum,
          providers.ipfs,
          ensAddresses.ensAddress,
          connection.networkNameOrChainId,
          new Wallet("0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1")
        )),
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

      const [account1] = setupAccounts();

      const transactionData: SafeWrapper_SafeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: transactionData,
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const tx = transactionResult.value as SafeWrapper_SafeTransaction;

      expect(tx).toBeTruthy();

      const addSignatureResult = await App.SafeWrapper_Module.addSignature({ tx: tx }, client, wrapperUri);

      expect(addSignatureResult.ok).toBeFalsy();
      //@ts-ignore
      expect(addSignatureResult.error?.message).toContain("Transactions can only be signed by Safe owners");
    });
  });
});
