import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupContractNetworks } from "../utils";
import { Client } from "@polywrap/core-js";
import { SafeTransaction } from "../../wrap";
import { SafeWrapper_SafeTransaction, SafeWrapper_SafeTransactionData } from "../types/wrap";

jest.setTimeout(1200000);

describe("Off-chain signatures", () => {
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;
  const ethereumUri = "wrap://ens/ethereum.polywrap.eth";

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };

  beforeAll(async () => {
    await initTestEnvironment();

    const plugins = await getPlugins(providers.ethereum, providers.ipfs, ensAddresses.ensAddress, connection.networkNameOrChainId);

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

  const createTransaction = (txData?: Partial<SafeWrapper_SafeTransactionData>) => {
    const defaults = {
      data: "0x",
      to: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
      value: "500000000000000000", // 0.5 ETH
    };
    return App.SafeWrapper_Module.createTransaction(
      {
        tx: {
          ...defaults,
          ...txData,
        },
      },
      client,
      wrapperUri
    );
  };

  const fundSafeBalance = (
    safe = safeAddress,
    amount = "1000000000000000000" // 1 ETH
  ) =>
    App.Ethereum_Module.sendTransactionAndWait(
      {
        tx: {
          to: safe,
          value: amount,
        },
        connection: connection,
      },
      client,
      ethereumUri
    );

  describe("Transactions execution", () => {
    describe("executeTransaction", () => {
      it("should fail if there are not enough Ether funds", async () => {
        const transactionRes = await createTransaction({});

        expect(transactionRes.ok).toBeTruthy();
        //@ts-ignore
        const transaction = transactionRes.value as SafeWrapper_SafeTransaction;

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        //@ts-ignore
        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx }, client, wrapperUri);

        expect(executionResult.ok).toBeFalsy();
        expect(executionResult.error.toString()).toContain("Not enough Ether funds");
      });

      it("should fail if there are not enough signatures (1 missing)", async () => {
        const [newSafeAddress] = await setupContractNetworks(client, { threshold: 2 });

        await fundSafeBalance(newSafeAddress);

        const transactionRes = await createTransaction({});

        expect(transactionRes.ok).toBeTruthy();
        //@ts-ignore
        const transaction = transactionRes.value as SafeWrapper_SafeTransaction;

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        //@ts-ignore
        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await client.invoke({
          uri: wrapperUri,
          method: "executeTransaction",
          args: { tx: signedTx },
          env: { safeAddress: newSafeAddress, connection: connection },
        });

        expect(executionResult.ok).toBeFalsy();
        expect(executionResult.error.toString()).toContain(`There is 1 signature missing`);
      });

      it("should fail if there are not enough signatures (>1 missing)", async () => {
        const [newSafeAddress] = await setupContractNetworks(client, {
          threshold: 3,
          owners: ["0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "0xEc8E7Da193529bd8ddA13b1995F93F32989CF097", "0x456Bc5c730e4AB1C39BF1e8D1832636ff581a2c7"],
        });

        await fundSafeBalance(newSafeAddress);

        const transactionRes = await createTransaction({});

        expect(transactionRes.ok).toBeTruthy();
        //@ts-ignore
        const transaction = transactionRes.value as SafeTransaction;

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        //@ts-ignore
        const signedTx = signedTxRes.value as SafeTransaction;

        const executionResult = await client.invoke({
          uri: wrapperUri,
          method: "executeTransaction",
          args: { tx: signedTx },
          env: { safeAddress: newSafeAddress, connection: connection },
        });

        expect(executionResult.ok).toBeFalsy();
        expect(executionResult.error.toString()).toContain(`There are 2 signatures missing`);
      });

      it("should fail if the user tries to execute a transaction that was rejected", async () => {
        //TODO
      });

      it("should fail if a user tries to execute a transaction with options: { gas, gasLimit }", async () => {
        await fundSafeBalance(safeAddress);

        const transactionRes = await createTransaction({});

        expect(transactionRes.ok).toBeTruthy();
        //@ts-ignore
        const transaction = transactionRes.value as SafeWrapper_SafeTransaction;

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        //@ts-ignore
        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await App.SafeWrapper_Module.executeTransaction(
          { tx: signedTx, options: { gas: "1000", gasLimit: "1000" } },
          client,
          wrapperUri
        );

        expect(executionResult.ok).toBeFalsy();
        expect(executionResult.error.toString()).toContain(`Cannot specify gas and gasLimit together in transaction options`);
      });

      it("should fail if a user tries to execute a transaction with options: { nonce: <invalid_nonce> }", async () => {
        await fundSafeBalance(safeAddress);

        const transactionRes = await createTransaction();

        expect(transactionRes.ok).toBeTruthy();
        //@ts-ignore
        const transaction = transactionRes.value as SafeWrapper_SafeTransaction;
        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        // TODO NOT signing tx with incorrect length
        //console.log("signedTxRes", signedTxRes);

        //@ts-ignore
        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx, options: { nonce: "-1" } }, client, wrapperUri);

        expect(executionResult.ok).toBeFalsy();
        console.log("executionResult", executionResult);
        expect(executionResult.error.toString()).toContain(`Nonce too high`);
      });

      it("should execute a transaction with threshold 1", async () => {});
      it("should execute a transaction with threshold >1", async () => {});
      it("should execute a transaction when is not submitted by an owner", async () => {});
      it("should execute a transaction with options: { gasLimit }", async () => {});
      it("should execute a transaction with options: { gasLimit, gasPrice }", async () => {});
      it("should execute a transaction with options: { maxFeePerGas, maxPriorityFeePerGas }", async () => {});
      it("should execute a transaction with options: { nonce }", async () => {});
    });
    describe("executeTransaction (MultiSend)", () => {
      it("should execute a batch transaction with threshold >1", async () => {});
      it("should execute a batch transaction with contract calls and threshold >1", async () => {});
    });
  });
});
