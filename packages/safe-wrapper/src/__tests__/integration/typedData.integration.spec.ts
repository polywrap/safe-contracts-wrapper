import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getClientConfig, getEthAdapter, setupContractNetworks, setupTests as setupTestsBase } from "../utils";
import Safe from "@safe-global/safe-core-sdk";
import { Uri } from "@polywrap/core-js";

jest.setTimeout(1200000);

describe("Safe Wrapper", () => {
  let safeAddress: string;

  let client: PolywrapClient;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };

  let setupTests: () => ReturnType<typeof setupTestsBase>;
  beforeAll(async () => {
    await initTestEnvironment();

    client = new PolywrapClient(getClientConfig())

    const setupContractsResult = await setupContractNetworks(client);
    safeAddress = setupContractsResult[0];

    setupTests = setupTestsBase.bind({}, connection.chainId, setupContractsResult[1], '1.3.0');

    const env = {
      uri: Uri.from(wrapperUri),
      env: {
        safeAddress: safeAddress,
        connection: connection,
      },
    }
    client = new PolywrapClient(getClientConfig({ safeEnv: env }));
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
        //@ts-ignore
        ethAdapter,
        safeAddress: safeAddress,
        //@ts-ignore
        contractNetworks,
      });

      const transactionData = { data: "0x", to: account1.address, value: "50000000" };

      const wrapperSigned = await App.SafeWrapper_Module.signTypedData({ tx: transactionData }, client, wrapperUri);
      if(!wrapperSigned.ok) fail(wrapperSigned.error)

      const tx = await safeSdk.createTransaction({
        safeTransactionData: transactionData,
      });

      const sdkSigned = await safeSdk.signTypedData(tx);

      expect(wrapperSigned.value.data).toEqual(sdkSigned.data);
    });
  });
});
