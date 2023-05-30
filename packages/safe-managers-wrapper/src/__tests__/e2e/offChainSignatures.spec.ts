import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import {
  getClientConfig,
  initInfra,
  setupAccounts,
  setupContractNetworks,
  stopInfra,
} from "../utils";

jest.setTimeout(1200000);

const safeVersion = process.env.SAFE_VERSION! as "1.2.0" | "1.3.0";
console.log("safeVersion", safeVersion);

describe(`Off-chain signatures v${safeVersion}`, () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  beforeAll(async () => {
    await initInfra();
    let config = await getClientConfig();
    client = new PolywrapClient(config);

    [safeAddress] = await setupContractNetworks(client, {}, safeVersion);
    config = await getClientConfig({ safeAddress });

    client = new PolywrapClient(config);
  });

  afterAll(async () => {
    await stopInfra();
  });

  describe("signTransactionHash", () => {
    it("should sign a transaction hash with the current signer", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
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
      if (!transactionResult.ok) fail(transactionResult.error);
      const tx = transactionResult.value;

      expect(tx).toBeTruthy();

      const transactionHashResult =
        await App.SafeWrapper_Module.getTransactionHash(
          { tx: tx.data },
          client,
          wrapperUri
        );
      if (!transactionHashResult.ok) fail(transactionHashResult.error);

      const hash = transactionHashResult.value as string;

      expect(hash).toBeTruthy();

      const signatureResult = await App.SafeWrapper_Module.signTransactionHash(
        { hash: hash },
        client,
        wrapperUri
      );
      if (!signatureResult.ok) fail(signatureResult.error);
      const signature = signatureResult.value;

      expect(signature).toBeTruthy();
      expect(signature.data.length).toEqual(132);
    });
  });

  describe("signTransaction", () => {
    it("should add the signature of the current signer", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
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
      if (!transactionResult.ok) fail(transactionResult.error);
      const tx = transactionResult.value;

      expect(tx).toBeTruthy();
      expect(tx.signatures?.size).toEqual(0);

      const signedTransactionResult = await App.SafeWrapper_Module.addSignature(
        { tx: tx },
        client,
        wrapperUri
      );

      if (!signedTransactionResult.ok) fail(signedTransactionResult.error);
      const signedTransaction = signedTransactionResult.value;

      const signatures = signedTransaction.signatures!;

      expect(signatures.size).toEqual(1);
    });

    it("should ignore duplicated signatures", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
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

      if (!transactionResult.ok) fail(transactionResult.error);
      const tx = transactionResult.value;

      expect(tx).toBeTruthy();
      expect(tx.signatures?.size).toEqual(0);

      const signedTransactionResult = await App.SafeWrapper_Module.addSignature(
        { tx: tx },
        client,
        wrapperUri
      );

      if (!signedTransactionResult.ok) fail(signedTransactionResult.error);
      const signedTx = signedTransactionResult.value;

      expect(signedTx).toBeTruthy();

      expect(signedTx.signatures?.size).toEqual(1);

      //Try to sign second time
      const signedTransactionResult2 =
        await App.SafeWrapper_Module.addSignature(
          { tx: signedTx },
          client,
          wrapperUri
        );

      if (!signedTransactionResult2.ok) fail(signedTransactionResult2.error);
      const signedTx2 = signedTransactionResult2.value;

      expect(signedTx2.signatures?.size).toEqual(1);
    });

    it("should fail if signature is added by an account that is not an owner", async () => {
      const [, , account3] = setupAccounts();
      //recreating client with new signer
      const config = getClientConfig({ signer: account3.signer, safeAddress });
      client = new PolywrapClient(config);

      const [account1] = setupAccounts();

      const transactionData = {
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

      if (!transactionResult.ok) fail(transactionResult.error);
      const tx = transactionResult.value;

      expect(tx).toBeTruthy();

      const addSignatureResult = await App.SafeWrapper_Module.addSignature(
        { tx: tx },
        client,
        wrapperUri
      );

      if (addSignatureResult.ok) fail();
      expect(addSignatureResult.error!.message).toContain(
        "Transactions can only be signed by Safe owners"
      );
    });
  });
});
