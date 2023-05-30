import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import {
  getClientConfig,
  initInfra,
  safeContractsPath,
  setupAccounts,
  setupContractNetworks,
  stopInfra,
} from "../utils";
import { Ethers_TxReceipt } from "../types/wrap";
import { Wallet } from "ethers";

jest.setTimeout(1200000);

const safeVersion = process.env.SAFE_VERSION! as "1.2.0" | "1.3.0";
console.log("safeVersion", safeVersion);

describe(`On-chain signatures v${safeVersion}`, () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const contractWrapperUri = `fs/${safeContractsPath}/build`;

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };

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

  describe("approveTransactionHash", () => {
    it("should fail if a transaction hash is approved by an account that is not an owner", async () => {
      const [account1] = setupAccounts();
      // Init client with different signer

      const config = getClientConfig({
        signer: new Wallet(
          "0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4"
        ),
        safeAddress,
      });

      const transactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionHashResult =
        await App.SafeWrapper_Module.getTransactionHash(
          { tx: transactionData },
          client,
          wrapperUri
        );

      if (!transactionHashResult.ok) fail(transactionHashResult.error);
      const txHash = transactionHashResult.value!;

      const response = await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        new PolywrapClient(config), // Using client with different signer to try to approve hash
        wrapperUri
      );

      if (response.ok) fail();
      const error = response.error!.toString();
      expect(error).toContain(
        "Transaction hashes can only be approved by Safe owners"
      );
    });

    it("should approve the transaction hash", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionHashResult =
        await App.SafeWrapper_Module.getTransactionHash(
          { tx: transactionData },
          client,
          wrapperUri
        );
      if (!transactionHashResult.ok) fail(transactionHashResult.error);
      const txHash = transactionHashResult.value!;

      const response = await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        client,
        wrapperUri
      );
      expect(response).toBeTruthy();
      if (!response.ok) fail(response.error);
      const txReceipt = response.value as Ethers_TxReceipt;

      expect(txReceipt.transactionHash).toBeTruthy();
      expect(txReceipt.logs.length).toBeGreaterThan(0);
      expect(txReceipt.to.toLowerCase()).toEqual(safeAddress.toLowerCase());

      const approvedHashesResponse =
        await App.SafeContracts_Module.approvedHashes(
          {
            address: safeAddress,
            hash: txHash,
            ownerAddress: account1.address,
            connection: connection,
          },
          client,
          contractWrapperUri
        );
      if (!approvedHashesResponse.ok) fail(approvedHashesResponse.error);
      const approvedHashes = approvedHashesResponse.value;

      expect(approvedHashes).toEqual("1");
    });

    it("should ignore a duplicated signatures", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
        to: account1.address,
        value: "500000000000000000", // 0.5 ETH
        data: "0x",
      };

      const transactionHashResult =
        await App.SafeWrapper_Module.getTransactionHash(
          { tx: transactionData },
          client,
          wrapperUri
        );

      if (!transactionHashResult.ok) fail(transactionHashResult.error);
      const txHash = transactionHashResult.value!;

      await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        client,
        wrapperUri
      );
      const approvedHashesResponse =
        await App.SafeContracts_Module.approvedHashes(
          {
            address: safeAddress,
            hash: txHash,
            ownerAddress: account1.address,
            connection: connection,
          },
          client,
          contractWrapperUri
        );
      if (!approvedHashesResponse.ok) fail(approvedHashesResponse.error);
      const approvedHashes = approvedHashesResponse.value;

      expect(approvedHashes).toEqual("1");

      await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        client,
        wrapperUri
      );
      const approvedHashesResponse2 =
        await App.SafeContracts_Module.approvedHashes(
          {
            address: safeAddress,
            hash: txHash,
            ownerAddress: account1.address,
            connection: connection,
          },
          client,
          contractWrapperUri
        );
      if (!approvedHashesResponse2.ok) fail(approvedHashesResponse2.error);
      const approvedHashes2 = approvedHashesResponse2.value;

      expect(approvedHashes2).toEqual("1");
    });
  });

  describe("getOwnersWhoApprovedTx", () => {
    it("should return the list of owners who approved a transaction hash", async () => {
      const [account1] = setupAccounts();

      const transactionData = {
        to: account1.address,
        value: "700000000000000000", // 0.7 ETH
        data: "0x",
      };

      const transactionHashResult =
        await App.SafeWrapper_Module.getTransactionHash(
          { tx: transactionData },
          client,
          wrapperUri
        );
      if (!transactionHashResult.ok) fail(transactionHashResult.error);
      const txHash = transactionHashResult.value!;

      const response = await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        client,
        wrapperUri
      );

      expect(response).toBeTruthy();

      const approvedHashesResponse =
        await App.SafeWrapper_Module.getOwnersWhoApprovedTx(
          { hash: txHash },
          client,
          wrapperUri
        );

      if (!approvedHashesResponse.ok) fail(approvedHashesResponse.error);
      const approvedHashes = approvedHashesResponse.value;

      expect(approvedHashes.length).toEqual(1);
      expect(approvedHashes).toContain(account1.address.toLowerCase());

      const config = getClientConfig({
        signer: new Wallet(
          "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
        ),
        safeAddress,
      });

      await App.SafeWrapper_Module.approveTransactionHash(
        {
          hash: txHash,
        },
        new PolywrapClient(config), // Using client with different signer to try to approve hash
        wrapperUri
      );

      const approvedHashesResponse2 =
        await App.SafeWrapper_Module.getOwnersWhoApprovedTx(
          { hash: txHash },
          client,
          wrapperUri
        );
      if (!approvedHashesResponse2.ok) fail(approvedHashesResponse2.error);
      const approvedHashes2 = approvedHashesResponse2.value;

      expect(approvedHashes2.length).toEqual(2);
      expect(approvedHashes2).toContain(
        "0xffcf8fdee72ac11b5c542428b35eef5769c409f0"
      );
    });
  });
});
