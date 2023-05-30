import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import {
  chainId,
  getClientConfig,
  getEthAdapter,
  initInfra,
  setupContractNetworks,
  setupTests as setupTestsBase,
  stopInfra,
} from "../utils";

import Safe from "@safe-global/safe-core-sdk";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "@polywrap/cli-js";

jest.setTimeout(1200000);

describe("Transactions creation", () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  let setupTests: () => ReturnType<typeof setupTestsBase>;
  beforeAll(async () => {
    await initInfra();

    client = new PolywrapClient(getClientConfig());

    const setupContractsResult = await setupContractNetworks(client);
    safeAddress = setupContractsResult[0];

    setupTests = setupTestsBase.bind(
      {},
      chainId,
      setupContractsResult[1],
      "1.3.0"
    );

    client = new PolywrapClient(getClientConfig({ safeAddress }));
  });

  afterAll(async () => {
    await stopInfra();
  });

  describe("standardizeSafeTransactionData", () => {});

  describe("createTransaction", () => {
    it("Should create SDK-like transaction based on full transaction data ", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );
      const safeSdk = await Safe.create({
        //@ts-ignore
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = (await ethAdapter.getNonce(account1.address)) + 1;

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
        nonce: nonce,
      };

      const sdkTx = await safeSdk.createTransaction({
        safeTransactionData,
      });

      const wrapperTxResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: {
            ...safeTransactionData,
            safeTxGas: String(safeTransactionData.safeTxGas),
            baseGas: String(safeTransactionData.baseGas),
            gasPrice: String(safeTransactionData.gasPrice),
            nonce: String(nonce),
            operation: String(safeTransactionData.operation),
          },
        },
        client,
        wrapperUri
      );

      if (!wrapperTxResult.ok) fail(wrapperTxResult.error);

      const wrapperTxData = wrapperTxResult.value.data;
      const sdkTxData = sdkTx.data;

      expect(wrapperTxData.to).toEqual(sdkTxData.to);
      expect(wrapperTxData.value).toEqual(sdkTxData.value);
      expect(wrapperTxData.data).toEqual(sdkTxData.data);
      expect(wrapperTxData.baseGas).toEqual(sdkTxData.baseGas.toString());
      expect(wrapperTxData.gasPrice).toEqual(sdkTxData.gasPrice.toString());
      expect(wrapperTxData.gasToken).toEqual(sdkTxData.gasToken);
      expect(wrapperTxData.refundReceiver).toEqual(sdkTxData.refundReceiver);
      expect(wrapperTxData.nonce).toEqual(sdkTxData.nonce.toString());
      expect(wrapperTxData.safeTxGas).toEqual(sdkTxData.safeTxGas.toString());
    });

    it("Should create SDK-like transaction based on minimal transaction data ", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );

      const safeSdk = await Safe.create({
        //@ts-ignore
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const safeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const sdkTx = await safeSdk.createTransaction({
        safeTransactionData: { ...safeTransactionData },
      });

      const wrapperTxResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: safeTransactionData,
        },
        client,
        wrapperUri
      );

      if (!wrapperTxResult.ok) fail(wrapperTxResult.error);

      const wrapperTxData = wrapperTxResult.value.data;
      const sdkTxData = sdkTx.data;

      expect(wrapperTxData.to).toEqual(sdkTxData.to);
      expect(wrapperTxData.value).toEqual(sdkTxData.value);
      expect(wrapperTxData.data).toEqual(sdkTxData.data);
      expect(wrapperTxData.baseGas).toEqual(sdkTxData.baseGas.toString());
      expect(wrapperTxData.gasPrice).toEqual(sdkTxData.gasPrice.toString());
      expect(wrapperTxData.gasToken).toEqual(sdkTxData.gasToken);
      expect(wrapperTxData.refundReceiver).toEqual(sdkTxData.refundReceiver);
      expect(wrapperTxData.nonce).toEqual(sdkTxData.nonce.toString());
      expect(wrapperTxData.safeTxGas).toEqual(sdkTxData.safeTxGas.toString());
    });

    it("should create SDK-like multisend transaction without options", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );

      const safeSdk = await Safe.create({
        //@ts-ignore
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });
      const safeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x00",
      };
      const safeTxArray = [safeTransactionData, safeTransactionData];

      const sdkMultisend = await safeSdk.createTransaction({
        safeTransactionData: safeTxArray,
      });

      const wrapperMultisendResult =
        await App.SafeWrapper_Module.createMultiSendTransaction(
          {
            txs: [safeTransactionData, safeTransactionData],
            customMultiSendContractAddress:
              contractNetworks[chainId].multiSendAddress,
          },
          client,
          wrapperUri
        );

      if (!wrapperMultisendResult.ok) fail(wrapperMultisendResult.error);
      const wrapperMultisendData = wrapperMultisendResult.value.data;
      const sdkMultisendData = sdkMultisend.data;

      expect(wrapperMultisendData.to).toEqual(sdkMultisendData.to);
      expect(wrapperMultisendData.value).toEqual(sdkMultisendData.value);
      expect(wrapperMultisendData.data).toEqual(sdkMultisendData.data);
      expect(wrapperMultisendData.baseGas).toEqual(
        sdkMultisendData.baseGas.toString()
      );
      expect(wrapperMultisendData.gasPrice).toEqual(
        sdkMultisendData.gasPrice.toString()
      );
      expect(wrapperMultisendData.gasToken).toEqual(sdkMultisendData.gasToken);
      expect(wrapperMultisendData.refundReceiver).toEqual(
        sdkMultisendData.refundReceiver
      );
      expect(wrapperMultisendData.nonce).toEqual(
        sdkMultisendData.nonce.toString()
      );
      expect(wrapperMultisendData.safeTxGas).toEqual(
        sdkMultisendData.safeTxGas.toString()
      );
    });

    it("should create SDK-like multisend transaction  with options", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(
        ETH_ENS_IPFS_MODULE_CONSTANTS.ethereumProvider,
        account1.signer
      );

      const safeSdk = await Safe.create({
        //@ts-ignore
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const safeTransactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x00",
      };

      const safeTxArray = [safeTransactionData, safeTransactionData];

      const options = {
        baseGas: 111,
        gasPrice: 222,
        gasToken: "0x333",
        refundReceiver: "0x444",
        nonce: 555,
        safeTxGas: 666,
      };

      const sdkMultisend = await safeSdk.createTransaction({
        safeTransactionData: safeTxArray,
        options: options,
      });

      const wrapperMultisendResult =
        await App.SafeWrapper_Module.createMultiSendTransaction(
          {
            txs: [safeTransactionData, safeTransactionData],
            options: {
              ...options,
              baseGas: String(options.baseGas),
              gasPrice: String(options.gasPrice),
              nonce: String(options.nonce),
              safeTxGas: String(options.safeTxGas),
            },
            customMultiSendContractAddress:
              contractNetworks[chainId].multiSendAddress,
          },
          client,
          wrapperUri
        );

      if (!wrapperMultisendResult.ok) fail(wrapperMultisendResult.error);
      const wrapperMultisendData = wrapperMultisendResult.value.data;
      const sdkMultisendData = sdkMultisend.data;

      expect(wrapperMultisendData.to).toEqual(sdkMultisendData.to);
      expect(wrapperMultisendData.value).toEqual(sdkMultisendData.value);
      expect(wrapperMultisendData.data).toEqual(sdkMultisendData.data);
      expect(wrapperMultisendData.baseGas).toEqual(
        sdkMultisendData.baseGas.toString()
      );
      expect(wrapperMultisendData.gasPrice).toEqual(
        sdkMultisendData.gasPrice.toString()
      );
      expect(wrapperMultisendData.gasToken).toEqual(sdkMultisendData.gasToken);
      expect(wrapperMultisendData.refundReceiver).toEqual(
        sdkMultisendData.refundReceiver
      );
      expect(wrapperMultisendData.nonce).toEqual(
        sdkMultisendData.nonce.toString()
      );
      expect(wrapperMultisendData.safeTxGas).toEqual(
        sdkMultisendData.safeTxGas.toString()
      );
    });
  });
});
