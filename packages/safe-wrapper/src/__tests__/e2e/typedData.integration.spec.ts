import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getEthAdapter, getPlugins, setupContractNetworks, setupTests as setupTestsBase } from "../utils";
import Safe from "@gnosis.pm/safe-core-sdk";
import { Client } from "@polywrap/core-js";

jest.setTimeout(1200000);

describe("Safe Wrapper", () => {
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };

  let setupTests: () => ReturnType<typeof setupTestsBase>;
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

    const setupContractsResult = await setupContractNetworks(client);
    safeAddress = setupContractsResult[0];

    setupTests = setupTestsBase.bind({}, connection.chainId, setupContractsResult[1]);

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

  describe("SignTypedData", () => {
    it("Should signTypedData SDK-like", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;

      const ethAdapter = await getEthAdapter(providers.ethereum, account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const transactionData = { data: "0x", to: account1.address, value: "50000000" };

      const wrapperSigned = await App.SafeWrapper_Module.signTypedData({ tx: transactionData }, client, wrapperUri);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: transactionData,
      });

      const sdkSigned = await safeSdk.signTypedData(tx);

      //@ts-ignore
      expect(wrapperSigned.value.data).toEqual(sdkSigned.data);
    });
  });
});
