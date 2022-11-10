import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupContractNetworks, setupTests as setupTestsBase } from "../utils";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
//import { SafeWrapper_SafeTransaction } from "../types/wrap";
import { Client } from "@polywrap/core-js";
//@ts-ignore
import { zeroAddress } from "ethereumjs-util";

jest.setTimeout(1200000);

describe("Safe Wrapper", () => {
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

  const connection = { networkNameOrChainId: "testnet", chainId: 1337 };
  const ethereumUri = "wrap://ens/ethereum.polywrap.eth";

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

  describe("Execute Transaction SDK-like", () => {
    it("Should create, sign and execute transaction SDK-like", async () => {
      const { accounts } = await setupTests();
      const [account1] = accounts;

      /*       // Send ETH to Safe
      await App.Ethereum_Module.sendTransactionAndWait(
        {
          tx: {
            to: safeAddress,
            value: "1000000000000000000", // 1 ETH
          },
          connection: connection,
        },
        client,
        ethereumUri
      );
 */

      const safeTransactionData: SafeTransactionDataPartial = {
        to: account1.address,
        value: "500000000000000", // 0.0005 ETH
        data: "0x",
        baseGas: 111,
        gasPrice: 453,
        gasToken: zeroAddress(),
        refundReceiver: zeroAddress(),
        safeTxGas: 0, //TODO find out why created from sdk transaction transforms this value to 0
        operation: 0,
      };

      const wrapperTxResult = await App.SafeWrapper_Module.createTransaction(
        {
          tx: {
            ...safeTransactionData,
            safeTxGas: String(safeTransactionData.safeTxGas),
            baseGas: String(safeTransactionData.baseGas),
            gasPrice: String(safeTransactionData.gasPrice),
            nonce: String(0),
            operation: String(safeTransactionData.operation),
          },
        },
        client,
        wrapperUri
      );

      //@ts-ignore
      const wrapperTx = wrapperTxResult.value;

      const wrapperSignedResult = await App.SafeWrapper_Module.addSignature({ tx: wrapperTx }, client, wrapperUri);

      //@ts-ignore
      const wrapperSigned = wrapperSignedResult.value;

      const wrapperExecResult = await App.SafeWrapper_Module.executeTransaction(
        {
          tx: wrapperSigned,
          //options: { gasLimit: "100000000" }
        },
        client,
        wrapperUri
      );

      console.log("wrapperExecResult", wrapperExecResult);
      //@ts-ignore
      //console.log("wrapperExecResult", JSON.stringify(wrapperExecResult.value.logs));
    });
  });
});
