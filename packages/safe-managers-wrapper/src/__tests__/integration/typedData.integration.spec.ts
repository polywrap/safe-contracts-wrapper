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

describe("Safe Wrapper", () => {
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

  describe("SignTypedData", () => {
    it("Should signTypedData SDK-like", async () => {
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

      const transactionData = {
        data: "0x",
        to: account1.address,
        value: "50000000",
      };

      const wrapperSigned = await App.SafeWrapper_Module.signTypedData(
        { tx: transactionData },
        client,
        wrapperUri
      );
      if (!wrapperSigned.ok) fail(wrapperSigned.error);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: transactionData,
      });

      const sdkSigned = await safeSdk.signTypedData(tx);

      expect(wrapperSigned.value.data).toEqual(sdkSigned.data);
    });
  });
});
