import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import {
  getEthAdapter,
  getClientConfig,
  setupContractNetworks,
  setupTests as setupTestsBase,
  chainId,
  initInfra,
  stopInfra,
} from "../utils";
import Safe from "@safe-global/safe-core-sdk";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import { ETH_ENS_IPFS_MODULE_CONSTANTS } from "polywrap";

jest.setTimeout(1200000);

describe("Safe Wrapper", () => {
  let safeAddress: string;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
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

  describe("SignTransaction", () => {
    it("Should return transaction hash SDK-like", async () => {
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
            safeTxGas: String(safeTxGas),
            baseGas: String(baseGas),
            gasPrice: String(gasPrice),
            nonce: String(txNonce),
            operation: String(tx.data.operation),
          },
        },
        client,
        wrapperUri
      );

      if (!wrapperHashResult.ok) fail(wrapperHashResult.error);
      const wrapperHash = wrapperHashResult.value as string;

      expect(wrapperHash).toEqual(sdkHash);
    });

    it("Should sign transaction hash SDK-like", async () => {
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

      const wrapperSignedResult =
        await App.SafeWrapper_Module.signTransactionHash(
          { hash: txHash },
          client,
          wrapperUri
        );
      if (!wrapperSignedResult.ok) fail(wrapperSignedResult.error);
      const wrapperSigned = wrapperSignedResult.value;

      const sdkSigned = await safeSdk.signTransactionHash(txHash);

      //@ts-ignore
      sdkSigned.signer = sdkSigned.signer.toLowerCase();
      expect(wrapperSigned).toEqual(sdkSigned);
    });

    it("Should create and sign transaction SDK-like", async () => {
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

      const safeTransactionData: SafeTransactionDataPartial = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
        baseGas: 111,
        gasPrice: 453,
        gasToken: zeroAddress,
        refundReceiver: zeroAddress,
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
      const wrapperTx = wrapperTxResult.value;

      const sdkSigned = await safeSdk.signTransaction(sdkTx);

      const wrapperSignedResult = await App.SafeWrapper_Module.addSignature(
        { tx: wrapperTx },
        client,
        wrapperUri
      );

      if (!wrapperSignedResult.ok) fail(wrapperSignedResult.error);
      const wrapperSigned = wrapperSignedResult.value;

      const wrapperTxData = wrapperSigned.data;
      const sdkTxData = sdkSigned.data;

      expect(wrapperTxData.to).toEqual(sdkTxData.to);
      expect(wrapperTxData.value).toEqual(sdkTxData.value);
      expect(wrapperTxData.data).toEqual(sdkTxData.data);
      expect(wrapperTxData.baseGas).toEqual(sdkTxData.baseGas.toString());
      expect(wrapperTxData.gasPrice).toEqual(sdkTxData.gasPrice.toString());
      expect(wrapperTxData.gasToken).toEqual(sdkTxData.gasToken);
      expect(wrapperTxData.refundReceiver).toEqual(sdkTxData.refundReceiver);
      expect(wrapperTxData.nonce).toEqual(sdkTxData.nonce.toString());
      // expect(wrapperTxData.safeTxGas).toEqual(sdkTxData.safeTxGas.toString());
    });
  });
});
