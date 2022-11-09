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
  describe("Transactions execution", () => {
    describe("executeTransaction", () => {
      it("should fail if there are not enough Ether funds", async () => {});
      it("should fail if there are not enough signatures (1 missing)", async () => {});
      it("should fail if there are not enough signatures (>1 missing)", async () => {});
      it("should fail if the user tries to execute a transaction that was rejected", async () => {});
      it("should fail if a user tries to execute a transaction with options: { gas, gasLimit }", async () => {});
      it("should fail if a user tries to execute a transaction with options: { nonce: <invalid_nonce> }", async () => {});
      it("should execute a transaction with threshold 1", async () => {});
      it("should execute a transaction with threshold >1", async () => {});
      it("should execute a transaction when is not submitted by an owner", async () => {});
      it("should execute a transaction with options: { gasLimit }", async () => {});
      it("should execute a transaction with options: { gasLimit, gasPrice }", async () => {});
      it("should execute a transaction with options: { maxFeePerGas, maxPriorityFeePerGas }", async () => {});
      it("should execute a transaction with options: { nonce }", async () => {});
    });
    describe("executeTransaction (MultiSend)", async () => {
      it("should execute a batch transaction with threshold >1", async () => {});
      it("should execute a batch transaction with contract calls and threshold >1", async () => {});
    });
  });
});
