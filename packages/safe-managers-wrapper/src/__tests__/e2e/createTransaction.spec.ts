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

describe(`Transactions creation v${safeVersion}`, () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  let contractNetworksPart: {
    proxyContractAddress: string;
    safeContractAddress: string;
    multisendAddress: string;
    multisendCallOnlyAddress: string;
  };

  beforeAll(async () => {
    await initInfra();
    let config = await getClientConfig();
    client = new PolywrapClient(config);

    [safeAddress, contractNetworksPart] = await setupContractNetworks(
      client,
      {},
      safeVersion
    );
    config = await getClientConfig({ safeAddress });

    client = new PolywrapClient(config);
  });

  afterAll(async () => {
    await stopInfra();
  });

  it("should create a single transaction with gasPrice=0", async () => {
    const [account1] = setupAccounts();

    const transactionData = {
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

    if (!transactionResult.ok) fail(transactionResult.error);
    const transaction = transactionResult.value.data;

    expect(transaction).toMatchObject(transactionData);
  });

  it("should create a single transaction with gasPrice>0", async () => {
    const [account1] = setupAccounts();

    const transactionData = {
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

    if (!transactionResult.ok) fail(transactionResult.error);
    const transaction = transactionResult.value.data;

    expect(transaction).toMatchObject(transactionData);
  });

  it("should create a single transaction when passing a transaction array with length=1", async () => {
    const [account1] = setupAccounts();

    const safeTransactionData = {
      to: account1.address,
      value: "500000000000000000", // 0.5 ETH
      data: "0x00",
    };

    const safeTxArray = [safeTransactionData];

    const wrapperResult =
      await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: safeTxArray,
          customMultiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

    if (!wrapperResult.ok) fail(wrapperResult.error);
    const wrapperResultData = wrapperResult.value.data;

    expect(wrapperResultData.to).toEqual(safeTransactionData.to);
    expect(wrapperResultData.value).toEqual(safeTransactionData.value);
    expect(wrapperResultData.data).toEqual(safeTransactionData.data);
  });

  it("should create a single transaction when passing a transaction array with length=1 and options", async () => {
    const [account1] = setupAccounts();

    const safeTransactionData = {
      to: account1.address,
      value: "500000000000000000", // 0.5 ETH
      data: "0x00",
    };

    const safeTxArray = [safeTransactionData];

    const options = {
      baseGas: "111",
      gasPrice: "222",
      gasToken: "0x333",
      refundReceiver: "0x444",
      nonce: "555",
      safeTxGas: "666",
    };

    const wrapperResult =
      await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: safeTxArray,
          options: options,
          customMultiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

    if (!wrapperResult.ok) fail(wrapperResult.error);
    const wrapperResultData = wrapperResult.value.data;

    expect(wrapperResultData.to).toEqual(safeTransactionData.to);
    expect(wrapperResultData.value).toEqual(safeTransactionData.value);
    expect(wrapperResultData.data).toEqual(safeTransactionData.data);
    expect(wrapperResultData.baseGas).toEqual(options.baseGas);
    expect(wrapperResultData.gasPrice).toEqual(options.gasPrice);
    expect(wrapperResultData.gasToken).toEqual(options.gasToken);
    expect(wrapperResultData.refundReceiver).toEqual(options.refundReceiver);
    expect(wrapperResultData.nonce).toEqual(options.nonce);
    expect(wrapperResultData.safeTxGas).toEqual(options.safeTxGas);
  });

  it("should fail when creating a MultiSend transaction passing a transaction array with length=0", async () => {
    const multiSendResult =
      await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: [],
          customMultiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

    expect(multiSendResult.ok).toBe(false);
  });

  it("should create a MultiSend transaction", async () => {
    const [account1] = setupAccounts();

    const safeTransactionData = {
      to: account1.address,
      value: "500000000000000000", // 0.5 ETH
      data: "0x00",
    };

    const safeTxArray = [safeTransactionData, safeTransactionData];

    const wrapperResult =
      await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: safeTxArray,
          customMultiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

    if (!wrapperResult.ok) fail(wrapperResult.error);
    const wrapperResultData = wrapperResult.value.data;

    expect(wrapperResultData.to).toEqual(contractNetworksPart.multisendAddress);
    expect(wrapperResultData.data).not.toEqual(safeTransactionData.data);
  });

  it("should create a MultiSend transaction with options", async () => {
    const [account1] = setupAccounts();

    const safeTransactionData = {
      to: account1.address,
      value: "500000000000000000", // 0.5 ETH
      data: "0x00",
    };

    const safeTxArray = [safeTransactionData, safeTransactionData];

    const options = {
      baseGas: "111",
      gasPrice: "222",
      gasToken: "0x333",
      refundReceiver: "0x444",
      nonce: "555",
      safeTxGas: "666",
    };

    const wrapperResult =
      await App.SafeWrapper_Module.createMultiSendTransaction(
        {
          txs: safeTxArray,
          options: options,
          customMultiSendContractAddress: contractNetworksPart.multisendAddress,
        },
        client,
        wrapperUri
      );

    if (!wrapperResult.ok) fail(wrapperResult.error);
    const wrapperResultData = wrapperResult.value.data;

    expect(wrapperResultData.to).toEqual(contractNetworksPart.multisendAddress);
    expect(wrapperResultData.data).not.toEqual(safeTransactionData.data);
    expect(wrapperResultData.value).not.toEqual(safeTransactionData.value);

    expect(wrapperResultData.baseGas).toEqual(options.baseGas);
    expect(wrapperResultData.gasPrice).toEqual(options.gasPrice);
    expect(wrapperResultData.gasToken).toEqual(options.gasToken);
    expect(wrapperResultData.refundReceiver).toEqual(options.refundReceiver);
    expect(wrapperResultData.nonce).toEqual(options.nonce);
    expect(wrapperResultData.safeTxGas).toEqual(options.safeTxGas);
  });
});
