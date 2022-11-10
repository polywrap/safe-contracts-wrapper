import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getEthAdapter, getPlugins, setupAccounts, setupContractNetworks } from "../utils";
import { Client } from "@polywrap/core-js";
import { SafeWrapper_SafeTransaction, SafeWrapper_SafeTransactionData } from "../types/wrap";
import { BigNumber, Wallet } from "ethers";

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

  const createTransaction = async (txData?: Partial<SafeWrapper_SafeTransactionData>) => {
    const defaults = {
      data: "0x",
      to: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
      value: "500000000000000000", // 0.5 ETH
    };
    const txResult = await App.SafeWrapper_Module.createTransaction(
      {
        tx: {
          ...defaults,
          ...txData,
        },
      },
      client,
      wrapperUri
    );

    if (!txResult.ok) fail(txResult.error);

    return txResult.value;
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

  const initClientWithSigner = async (signer: Wallet, safeAddr = safeAddress) => {
    const plugins = await getPlugins(providers.ethereum, providers.ipfs, ensAddresses.ensAddress, connection.networkNameOrChainId, signer);

    const client = new PolywrapClient({
      ...plugins,
      envs: [
        {
          uri: wrapperUri,
          env: {
            safeAddress: safeAddr,
            connection: connection,
          },
        },
      ],
    }) as unknown as Client;
    return client;
  };

  describe("Transactions execution", () => {
    describe("executeTransaction", () => {
      it("should fail if there are not enough Ether funds", async () => {
        const transaction = await createTransaction();

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        if (!signedTxRes.ok) fail(signedTxRes.error);
        const signedTx = signedTxRes.value;

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx }, client, wrapperUri);

        executionResult.ok ? fail() : expect(executionResult.error!.toString()).toContain("Not enough Ether funds");
      });

      it("should fail if there are not enough signatures (1 missing)", async () => {
        const [newSafeAddress] = await setupContractNetworks(client, { threshold: 2 });

        await fundSafeBalance(newSafeAddress);

        const transaction = await createTransaction();

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);

        if (!signedTxRes.ok) fail(signedTxRes.error);
        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await client.invoke({
          uri: wrapperUri,
          method: "executeTransaction",
          args: { tx: signedTx },
          env: { safeAddress: newSafeAddress, connection: connection },
        });

        executionResult.ok ? fail() : expect(executionResult.error!.toString()).toContain(`There is 1 signature missing`);
      });

      it("should fail if there are not enough signatures (>1 missing)", async () => {
        const [newSafeAddress] = await setupContractNetworks(client, {
          threshold: 3,
          owners: ["0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0", "0x456Bc5c730e4AB1C39BF1e8D1832636ff581a2c7"],
        });

        await fundSafeBalance(newSafeAddress);

        const transaction = await createTransaction();

        const signedTxRes = await client.invoke({
          uri: wrapperUri,
          method: "addSignature",
          args: { tx: transaction },
          env: { safeAddress: newSafeAddress, connection: connection },
        });

        if (!signedTxRes.ok) fail(signedTxRes.error);
        const signedTx = signedTxRes.value;

        const executionResult = await client.invoke({
          uri: wrapperUri,
          method: "executeTransaction",
          args: { tx: signedTx },
          env: { safeAddress: newSafeAddress, connection: connection },
        });

        executionResult.ok ? fail() : expect(executionResult.error!.toString()).toContain(`There are 2 signatures missing`);
      });

      it.skip("should fail if the user tries to execute a transaction that was rejected", async () => {
        //TODO
      });

      it("should fail if a user tries to execute a transaction with options: { gas, gasLimit }", async () => {
        await fundSafeBalance(safeAddress);

        const transaction = await createTransaction();

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);
        if (!signedTxRes.ok) fail(signedTxRes.error);

        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await App.SafeWrapper_Module.executeTransaction(
          { tx: signedTx, options: { gas: "1000", gasLimit: "1000" } },
          client,
          wrapperUri
        );

        if (!executionResult.ok) expect(executionResult.error!.toString()).toContain(`Cannot specify gas and gasLimit together in transaction options`);
      });

      it.skip("should fail if a user tries to execute a transaction with options: { nonce: <invalid_nonce> }", async () => {
        // Not implemented in ethereum-plugin
      });

      it("should execute a transaction with threshold 1", async () => {
        await fundSafeBalance();

        const balanceBefore = await App.Ethereum_Module.getBalance({ address: safeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceBefore.ok) fail(balanceBefore.error);

        const transferAmount = "500000000000000000";

        const transaction = await createTransaction();

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client, wrapperUri);
        if (!signedTxRes.ok) fail(signedTxRes.error);

        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx }, client, wrapperUri);

        if (!executionResult.ok) fail(executionResult.error);

        const balanceAfter = await App.Ethereum_Module.getBalance({ address: safeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceAfter.ok) fail(balanceAfter.error);

        expect(BigNumber.from(balanceAfter.value).toString()).toEqual(BigNumber.from(balanceBefore.value).sub(transferAmount).toString());
      });

      it("should execute a transaction with threshold >1", async () => {
        const [account1, account2, account3] = setupAccounts();

        const [newSafeAddress] = await setupContractNetworks(client, {
          threshold: 2,
          owners: [account1.address, account2.address, account3.address],
        });

        const client1 = await initClientWithSigner(account1.signer, newSafeAddress);
        const client2 = await initClientWithSigner(account2.signer, newSafeAddress);
        const client3 = await initClientWithSigner(account3.signer, newSafeAddress);

        await fundSafeBalance(newSafeAddress);

        const balanceBefore = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceBefore.ok) fail(balanceBefore.error);

        const transferAmount = "500000000000000000";

        const transaction = await createTransaction({ value: transferAmount });

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client1, wrapperUri);
        if (!signedTxRes.ok) fail(signedTxRes.error);

        const signedTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const txHashRes = await App.SafeWrapper_Module.getTransactionHash({ tx: signedTx.data }, client2, wrapperUri);
        if (!txHashRes.ok) fail(txHashRes.error);
        const txHash = txHashRes.value!;

        const approveRes = await App.SafeWrapper_Module.approveTransactionHash({ hash: txHash }, client2, wrapperUri);
        expect(approveRes.ok).toBeTruthy();

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx }, client3, wrapperUri);
        expect(executionResult.ok).toBeTruthy();

        const balanceAfter = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceAfter.ok) fail(balanceAfter.error);
        expect(BigNumber.from(balanceAfter.value).toString()).toEqual(BigNumber.from(balanceBefore.value).sub(transferAmount).toString());
      });

      it("should execute a transaction when is not submitted by an owner", async () => {
        const [account1, account2, account3] = setupAccounts();

        const [newSafeAddress] = await setupContractNetworks(client, {
          threshold: 2,
          owners: [account1.address, account2.address],
        });

        const client1 = await initClientWithSigner(account1.signer, newSafeAddress);
        const client2 = await initClientWithSigner(account2.signer, newSafeAddress);
        const client3 = await initClientWithSigner(account3.signer, newSafeAddress);

        await fundSafeBalance(newSafeAddress);

        const balanceBefore = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceBefore.ok) fail(balanceBefore.error);

        const transferAmount = "500000000000000000";
        const transaction = await createTransaction({ value: transferAmount });

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: transaction }, client1, wrapperUri);
        if (!signedTxRes.ok) fail(signedTxRes.error);
        const signedTx = signedTxRes.value;

        const txHashRes = await App.SafeWrapper_Module.getTransactionHash({ tx: signedTx.data }, client2, wrapperUri);
        if (!txHashRes.ok) fail(txHashRes.error);
        const txHash = txHashRes.value!;

        const approveRes = await App.SafeWrapper_Module.approveTransactionHash({ hash: txHash }, client2, wrapperUri);
        expect(approveRes.ok).toBeTruthy();

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedTx }, client3, wrapperUri);
        expect(executionResult.ok).toBeTruthy();

        const balanceAfter = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceAfter.ok) fail(balanceAfter.error);

        expect(BigNumber.from(balanceAfter.value).toString()).toEqual(BigNumber.from(balanceBefore.value).sub(transferAmount).toString());
      });

      it("should execute a transaction with options: { gasLimit }", async () => {
        const [account1] = setupAccounts();
        await fundSafeBalance();

        const transaction = await createTransaction();

        const execOptions = { gasLimit: "123456" };

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: transaction, options: execOptions }, client, wrapperUri);
        if (!executionResult.ok) fail(executionResult.error);

        const ethAdapter = await getEthAdapter(providers.ethereum, account1.signer);

        const txConfirmed = await ethAdapter.getTransaction(executionResult.value.transactionHash);

        expect(execOptions.gasLimit).toEqual(txConfirmed.gasLimit.toString());
      });

      it("should execute a transaction with options: { gasLimit, gasPrice }", async () => {
        const [account1] = setupAccounts();
        await fundSafeBalance();

        const transaction = await createTransaction();

        const execOptions = { gasLimit: "123456", gasPrice: "170000000" };

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: transaction, options: execOptions }, client, wrapperUri);
        if (!executionResult.ok) fail(executionResult.error);

        const ethAdapter = await getEthAdapter(providers.ethereum, account1.signer);
        const txConfirmed = await ethAdapter.getTransaction(executionResult.value.transactionHash);

        expect(execOptions.gasLimit).toEqual(txConfirmed.gasLimit.toString());
        expect(execOptions.gasPrice).toEqual(txConfirmed.gasPrice.toString());
      });

      it.skip("should execute a transaction with options: { maxFeePerGas, maxPriorityFeePerGas }", async () => {
        // Not implemented in ethereum-plugin
      });
      it.skip("should execute a transaction with options: { nonce }", async () => {
        // Not implemented in ethereum-plugin
      });
    });

    describe("executeTransaction (MultiSend)", () => {
      it("should execute a batch transaction with threshold >1", async () => {
        const [account1, account2, account3] = setupAccounts();

        const [newSafeAddress, contractNetworks] = await setupContractNetworks(client, {
          threshold: 2,
          owners: [account1.address, account2.address, account3.address],
        });

        const client1 = await initClientWithSigner(account1.signer, newSafeAddress);
        const client2 = await initClientWithSigner(account2.signer, newSafeAddress);
        const client3 = await initClientWithSigner(account3.signer, newSafeAddress);

        await fundSafeBalance(newSafeAddress, "20000000000000000000");

        const balanceBefore = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceBefore.ok) fail(balanceBefore.error);

        const multisendTxData = [
          { to: account2.address, value: "1100000000000000000", data: "0x" },
          { to: account2.address, value: "100000000000000000", data: "0x" },
        ];

        const multisendTxRes = await App.SafeWrapper_Module.createMultiSendTransaction(
          {
            txs: multisendTxData,
            customMultiSendContractAddress: contractNetworks.multisendAddress,
          },
          client1,
          wrapperUri
        );

        if (!multisendTxRes.ok) fail(multisendTxRes.error);
        const multisendTx = multisendTxRes.value as SafeWrapper_SafeTransaction;

        const signedTxRes = await App.SafeWrapper_Module.addSignature({ tx: multisendTx }, client1, wrapperUri);
        if (!signedTxRes.ok) fail(signedTxRes.error);
        const signedMultisendTx = signedTxRes.value as SafeWrapper_SafeTransaction;

        const txHashRes = await App.SafeWrapper_Module.getTransactionHash({ tx: signedMultisendTx.data }, client2, wrapperUri);

        if (!txHashRes.ok) fail(txHashRes.error);
        const txHash = txHashRes.value!;

        const approveRes = await App.SafeWrapper_Module.approveTransactionHash({ hash: txHash }, client2, wrapperUri);
        if (!approveRes.ok) fail(approveRes.error);

        const executionResult = await App.SafeWrapper_Module.executeTransaction({ tx: signedMultisendTx }, client3, wrapperUri);
        if (!executionResult.ok) fail(executionResult.error);

        const balanceAfter = await App.Ethereum_Module.getBalance({ address: newSafeAddress, blockTag: null, connection: connection }, client, ethereumUri);
        if (!balanceAfter.ok) fail(balanceAfter.error);

        expect(BigNumber.from(balanceAfter.value).toString()).toEqual(
          BigNumber.from(balanceBefore.value).sub(multisendTxData[0].value).sub(multisendTxData[1].value).toString()
        );
      });

      it.skip("should execute a batch transaction with contract calls and threshold >1", async () => {});
    });
  });
});
