import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import {
  getClientConfig,
  getERC20Mintable,
  getEthAdapter,
  initInfra,
  setupAccounts,
  setupContractNetworks,
  stopInfra,
} from "../utils";
import { BigNumber, Wallet } from "ethers";
import { SafeWrapper_SafeTransactionData } from "../types/wrap";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "@polywrap/cli-js";

jest.setTimeout(1200000);

const safeVersion = process.env.SAFE_VERSION! as "1.2.0" | "1.3.0";
console.log("safeVersion", safeVersion);

describe(`Off-chain signatures  v${safeVersion}`, () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const ethereumUri = "wrap://ens/wraps.eth:ethereum@2.0.0";

  const connection = { networkNameOrChainId: "testnet" };

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

  const createTransaction = async (
    txData?: Partial<SafeWrapper_SafeTransactionData>
  ) => {
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
    App.Ethers_Module.sendTransactionAndWait(
      {
        tx: {
          to: safe,
          value: amount,
          data: "0x",
        },
        connection: connection,
      },
      client,
      ethereumUri
    );

  const initClientWithSigner = async (
    signer: Wallet,
    safeAddr = safeAddress
  ) => {
    const config = await getClientConfig({ safeAddress: safeAddr, signer });

    return new PolywrapClient(config);
  };

  describe("executeTransaction", () => {
    it("should fail if there are not enough Ether funds", async () => {
      const transaction = await createTransaction();

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client,
        wrapperUri
      );

      if (!signedTxRes.ok) fail(signedTxRes.error);
      const signedTx = signedTxRes.value;

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedTx },
        client,
        wrapperUri
      );

      executionResult.ok
        ? fail()
        : expect(executionResult.error!.toString()).toContain(
            "Not enough Ether funds"
          );
    });

    it("should fail if there are not enough signatures (1 missing)", async () => {
      const [newSafeAddress] = await setupContractNetworks(
        client,
        { threshold: 2 },
        safeVersion
      );

      await fundSafeBalance(newSafeAddress);

      const transaction = await createTransaction();

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client,
        wrapperUri
      );

      if (!signedTxRes.ok) fail(signedTxRes.error);
      const signedTx = signedTxRes.value;

      const executionResult = await client.invoke({
        uri: wrapperUri,
        method: "executeTransaction",
        args: { tx: signedTx },
        env: { safeAddress: newSafeAddress, connection: connection },
      });

      executionResult.ok
        ? fail()
        : expect(executionResult.error!.toString()).toContain(
            `There is 1 signature missing`
          );
    });

    it("should fail if there are not enough signatures (>1 missing)", async () => {
      const [newSafeAddress] = await setupContractNetworks(
        client,
        {
          threshold: 3,
          owners: [
            "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
            "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
            "0x456Bc5c730e4AB1C39BF1e8D1832636ff581a2c7",
          ],
        },
        safeVersion
      );

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

      executionResult.ok
        ? fail()
        : expect(executionResult.error!.toString()).toContain(
            `There are 2 signatures missing`
          );
    });

    it.skip("should fail if the user tries to execute a transaction that was rejected", async () => {
      //TODO
    });

    it("should fail if a user tries to execute a transaction with options: { gas, gasLimit }", async () => {
      await fundSafeBalance(safeAddress);

      const transaction = await createTransaction();

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client,
        wrapperUri
      );
      if (!signedTxRes.ok) fail(signedTxRes.error);

      const signedTx = signedTxRes.value;

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedTx, options: { gas: "1000", gasLimit: "1000" } },
        client,
        wrapperUri
      );

      if (!executionResult.ok)
        expect(executionResult.error!.toString()).toContain(
          `Cannot specify gas and gasLimit together in transaction options`
        );
    });

    it.skip("should fail if a user tries to execute a transaction with options: { nonce: <invalid_nonce> }", async () => {
      // Not implemented in ethereum-plugin
    });

    it("should execute a transaction with threshold 1", async () => {
      await fundSafeBalance();

      const balanceBefore = await App.Ethers_Module.getBalance(
        { address: safeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceBefore.ok) fail(balanceBefore.error);

      const transferAmount = "500000000000000000";

      const transaction = await createTransaction();

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client,
        wrapperUri
      );
      if (!signedTxRes.ok) fail(signedTxRes.error);

      const signedTx = signedTxRes.value;
      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedTx, options: { gasLimit: "400000" } },
        client,
        wrapperUri
      );

      if (!executionResult.ok) fail(executionResult.error);

      const balanceAfter = await App.Ethers_Module.getBalance(
        { address: safeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceAfter.ok) fail(balanceAfter.error);

      expect(BigNumber.from(balanceAfter.value).toString()).toEqual(
        BigNumber.from(balanceBefore.value).sub(transferAmount).toString()
      );
    });

    it("should execute a transaction with threshold >1", async () => {
      const [account1, account2, account3] = setupAccounts();

      const [newSafeAddress] = await setupContractNetworks(
        client,
        {
          threshold: 2,
          owners: [account1.address, account2.address, account3.address],
        },
        safeVersion
      );

      const client1 = await initClientWithSigner(
        account1.signer,
        newSafeAddress
      );
      const client2 = await initClientWithSigner(
        account2.signer,
        newSafeAddress
      );
      const client3 = await initClientWithSigner(
        account3.signer,
        newSafeAddress
      );

      await fundSafeBalance(newSafeAddress);

      const balanceBefore = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceBefore.ok) fail(balanceBefore.error);

      const transferAmount = "500000000000000000";

      const transaction = await createTransaction({ value: transferAmount });

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client1,
        wrapperUri
      );
      if (!signedTxRes.ok) fail(signedTxRes.error);
      const signedTx = signedTxRes.value;

      const txHashRes = await App.SafeWrapper_Module.getTransactionHash(
        { tx: signedTx.data },
        client2,
        wrapperUri
      );
      if (!txHashRes.ok) fail(txHashRes.error);
      const txHash = txHashRes.value!;

      const approveRes = await App.SafeWrapper_Module.approveTransactionHash(
        { hash: txHash },
        client2,
        wrapperUri
      );
      expect(approveRes.ok).toBeTruthy();

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedTx },
        client3,
        wrapperUri
      );
      expect(executionResult.ok).toBeTruthy();

      const balanceAfter = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceAfter.ok) fail(balanceAfter.error);
      expect(BigNumber.from(balanceAfter.value).toString()).toEqual(
        BigNumber.from(balanceBefore.value).sub(transferAmount).toString()
      );
    });

    it("should execute a transaction when is not submitted by an owner", async () => {
      const [account1, account2, account3] = setupAccounts();

      const [newSafeAddress] = await setupContractNetworks(
        client,
        {
          threshold: 2,
          owners: [account1.address, account2.address],
        },
        safeVersion
      );

      const client1 = await initClientWithSigner(
        account1.signer,
        newSafeAddress
      );
      const client2 = await initClientWithSigner(
        account2.signer,
        newSafeAddress
      );
      const client3 = await initClientWithSigner(
        account3.signer,
        newSafeAddress
      );

      await fundSafeBalance(newSafeAddress);

      const balanceBefore = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceBefore.ok) fail(balanceBefore.error);

      const transferAmount = "500000000000000000";
      const transaction = await createTransaction({ value: transferAmount });

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: transaction },
        client1,
        wrapperUri
      );
      if (!signedTxRes.ok) fail(signedTxRes.error);
      const signedTx = signedTxRes.value;

      const txHashRes = await App.SafeWrapper_Module.getTransactionHash(
        { tx: signedTx.data },
        client2,
        wrapperUri
      );
      if (!txHashRes.ok) fail(txHashRes.error);
      const txHash = txHashRes.value!;

      const approveRes = await App.SafeWrapper_Module.approveTransactionHash(
        { hash: txHash },
        client2,
        wrapperUri
      );
      expect(approveRes.ok).toBeTruthy();

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedTx },
        client3,
        wrapperUri
      );
      expect(executionResult.ok).toBeTruthy();

      const balanceAfter = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceAfter.ok) fail(balanceAfter.error);

      expect(BigNumber.from(balanceAfter.value).toString()).toEqual(
        BigNumber.from(balanceBefore.value).sub(transferAmount).toString()
      );
    });

    it("should execute a transaction with options: { gasLimit }", async () => {
      const [account1] = setupAccounts();
      await fundSafeBalance();

      const transaction = await createTransaction();

      const execOptions = { gasLimit: "400000" };

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: transaction, options: execOptions },
        client,
        wrapperUri
      );
      if (!executionResult.ok) fail(executionResult.error);

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );

      const txConfirmed = await ethAdapter.getTransaction(
        executionResult.value.transactionHash
      );

      expect(execOptions.gasLimit).toEqual(txConfirmed.gasLimit.toString());
    });

    it("should execute a transaction with options: { gasLimit, gasPrice }", async () => {
      const [account1] = setupAccounts();
      await fundSafeBalance();

      const transaction = await createTransaction();

      const execOptions = { gasLimit: "654321", gasPrice: "170000000" };

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: transaction, options: execOptions },
        client,
        wrapperUri
      );
      if (!executionResult.ok) fail(executionResult.error);

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );
      const txConfirmed = await ethAdapter.getTransaction(
        executionResult.value.transactionHash
      );

      expect(execOptions.gasLimit).toEqual(txConfirmed.gasLimit.toString());
      // expect(execOptions.gasPrice).toEqual(txConfirmed.gasPrice.toString());
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

      const [newSafeAddress, contractNetworks] = await setupContractNetworks(
        client,
        {
          threshold: 2,
          owners: [account1.address, account2.address, account3.address],
        },
        safeVersion
      );

      const client1 = await initClientWithSigner(
        account1.signer,
        newSafeAddress
      );
      const client2 = await initClientWithSigner(
        account2.signer,
        newSafeAddress
      );
      const client3 = await initClientWithSigner(
        account3.signer,
        newSafeAddress
      );

      await fundSafeBalance(newSafeAddress, "20000000000000000000");

      const balanceBefore = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceBefore.ok) fail(balanceBefore.error);

      const multisendTxData = [
        { to: account2.address, value: "1100000000000000000", data: "0x" },
        { to: account2.address, value: "100000000000000000", data: "0x" },
      ];

      const multisendTxRes =
        await App.SafeWrapper_Module.createMultiSendTransaction(
          {
            txs: multisendTxData,
            customMultiSendContractAddress: contractNetworks.multisendAddress,
          },
          client1,
          wrapperUri
        );

      if (!multisendTxRes.ok) fail(multisendTxRes.error);
      const multisendTx = multisendTxRes.value;

      const signedTxRes = await App.SafeWrapper_Module.addSignature(
        { tx: multisendTx },
        client1,
        wrapperUri
      );
      if (!signedTxRes.ok) fail(signedTxRes.error);
      const signedMultisendTx = signedTxRes.value;

      const txHashRes = await App.SafeWrapper_Module.getTransactionHash(
        { tx: signedMultisendTx.data },
        client2,
        wrapperUri
      );

      if (!txHashRes.ok) fail(txHashRes.error);
      const txHash = txHashRes.value!;

      const approveRes = await App.SafeWrapper_Module.approveTransactionHash(
        { hash: txHash },
        client2,
        wrapperUri
      );
      if (!approveRes.ok) fail(approveRes.error);

      const executionResult = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedMultisendTx },
        client3,
        wrapperUri
      );
      if (!executionResult.ok) fail(executionResult.error);

      const balanceAfter = await App.Ethers_Module.getBalance(
        { address: newSafeAddress, blockTag: null, connection: connection },
        client,
        ethereumUri
      );
      if (!balanceAfter.ok) fail(balanceAfter.error);

      expect(BigNumber.from(balanceAfter.value).toString()).toEqual(
        BigNumber.from(balanceBefore.value)
          .sub(multisendTxData[0].value)
          .sub(multisendTxData[1].value)
          .toString()
      );
    });

    it("should execute a batch transaction with contract calls and threshold >1", async () => {
      const [account1, account2, account3] = setupAccounts();

      const [newSafeAddress, contractNetworks] = await setupContractNetworks(
        client,
        {
          threshold: 3,
          owners: [account1.address, account2.address, account3.address],
        },
        safeVersion
      );

      const client1 = await initClientWithSigner(
        account1.signer,
        newSafeAddress
      );
      const client2 = await initClientWithSigner(
        account2.signer,
        newSafeAddress
      );
      const client3 = await initClientWithSigner(
        account3.signer,
        newSafeAddress
      );

      const erc20Mintable = await getERC20Mintable(account1.signer);

      await erc20Mintable.mint(newSafeAddress, "1200000000000000000");
      const safeInitialERC20Balance = await erc20Mintable.balanceOf(
        newSafeAddress
      );

      expect(safeInitialERC20Balance.toString()).toEqual("1200000000000000000"); // 1.2 ERC20

      const accountInitialERC20Balance = await erc20Mintable.balanceOf(
        account2.address
      );
      expect(accountInitialERC20Balance.toString()).toEqual("0"); // 0 ERC20

      const safeTransactionData = [
        {
          to: erc20Mintable.address,
          value: "0",
          data: erc20Mintable.interface.encodeFunctionData("transfer", [
            account2.address,
            "1100000000000000000", // 1.1 ERC20
          ]),
        },
        {
          to: erc20Mintable.address,
          value: "0",
          data: erc20Mintable.interface.encodeFunctionData("transfer", [
            account2.address,
            "100000000000000000", // 0.1 ERC20
          ]),
        },
      ];

      const multiSendTxResult =
        await App.SafeWrapper_Module.createMultiSendTransaction(
          {
            txs: safeTransactionData,
            customMultiSendContractAddress: contractNetworks.multisendAddress,
          },
          client1,
          wrapperUri
        );
      if (!multiSendTxResult.ok) fail(multiSendTxResult.error);

      const signedMultiSendTxResult = await App.SafeWrapper_Module.addSignature(
        { tx: multiSendTxResult.value },
        client1,
        wrapperUri
      );
      if (!signedMultiSendTxResult.ok) fail(signedMultiSendTxResult.error);
      const signedMultiSendTx = signedMultiSendTxResult.value;

      const txHashResult = await App.SafeWrapper_Module.getTransactionHash(
        { tx: signedMultiSendTx.data },
        client2,
        wrapperUri
      );
      if (!txHashResult.ok) fail(txHashResult.error);

      const txResponse1 = await App.SafeWrapper_Module.approveTransactionHash(
        { hash: txHashResult.value! },
        client2,
        wrapperUri
      );
      if (!txResponse1.ok) fail(txResponse1.error);
      const txResponse2 = await App.SafeWrapper_Module.executeTransaction(
        { tx: signedMultiSendTx },
        client3,
        wrapperUri
      );
      if (!txResponse2.ok) fail(txResponse2.error);

      const safeFinalERC20Balance = await erc20Mintable.balanceOf(
        newSafeAddress
      );

      expect(safeFinalERC20Balance.toString()).toEqual("0"); // 0 ERC20
      const accountFinalERC20Balance = await erc20Mintable.balanceOf(
        account2.address
      );
      expect(accountFinalERC20Balance.toString()).toEqual(
        "1200000000000000000"
      ); // 1.2 ERC20
    });
  });
});
