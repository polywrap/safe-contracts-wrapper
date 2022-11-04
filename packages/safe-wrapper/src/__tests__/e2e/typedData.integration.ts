import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getEthAdapter, getPlugins, setupContractNetworks, setupTests as setupTestsBase } from "../utils";
import Safe from "@gnosis.pm/safe-core-sdk";
import { Client } from "@polywrap/core-js";
import { BigNumber } from "ethers";
import semverSatisfies from "semver/functions/satisfies";
import { SafeTransactionEIP712Args, GenerateTypedData } from "@gnosis.pm/safe-core-sdk-types";

jest.setTimeout(1200000);

export const EIP712_DOMAIN_BEFORE_V130 = [
  {
    type: "address",
    name: "verifyingContract",
  },
];

export const EIP712_DOMAIN = [
  {
    type: "uint256",
    name: "chainId",
  },
  {
    type: "address",
    name: "verifyingContract",
  },
];

const EQ_OR_GT_1_3_0 = ">=1.3.0";

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

  function getEip712MessageTypes(safeVersion: string): {
    EIP712Domain: typeof EIP712_DOMAIN | typeof EIP712_DOMAIN_BEFORE_V130;
    SafeTx: Array<{ type: string; name: string }>;
  } {
    const eip712WithChainId = semverSatisfies(safeVersion, EQ_OR_GT_1_3_0);
    return {
      EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
      SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
      ],
    };
  }

  function generateTypedData(
    //@ts-ignore
    { safeAddress, safeVersion, chainId, safeTransactionData }: SafeTransactionEIP712Args
  ): GenerateTypedData {
    const eip712WithChainId = semverSatisfies(safeVersion, EQ_OR_GT_1_3_0);
    const typedData: GenerateTypedData = {
      types: getEip712MessageTypes(safeVersion),
      domain: {
        verifyingContract: safeAddress,
      },
      primaryType: "SafeTx",
      message: {
        ...safeTransactionData,
        value: BigNumber.from(safeTransactionData.value),
        safeTxGas: BigNumber.from(safeTransactionData.safeTxGas),
        baseGas: BigNumber.from(safeTransactionData.baseGas),
        gasPrice: BigNumber.from(safeTransactionData.gasPrice),
        nonce: BigNumber.from(safeTransactionData.nonce),
      },
    };
    if (eip712WithChainId) {
      //@ts-ignore
      typedData.domain.chainId = chainId;
    }
    return typedData;
  }

  describe.skip("SignTypedData", () => {
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

      const tx = await safeSdk.createTransaction({
        safeTransactionData: { data: "0x", to: account1.address, value: "50000000" },
      });

      const safeTransactionEIP712Args: SafeTransactionEIP712Args = {
        safeAddress: safeAddress,
        safeVersion: "1.3.0",
        chainId: 1337,
        safeTransactionData: tx.data,
      };

      const typedData = generateTypedData(safeTransactionEIP712Args);

      const methodVersion = "v2";

      let method = "eth_signTypedData_v3";

      //@ts-ignore
      if (methodVersion === "v4") {
        method = "eth_signTypedData_v4";
      } else if (!methodVersion || methodVersion !== "v3" || methodVersion !== "v4") {
        method = "eth_signTypedData";
      }

      const jsonTypedData = JSON.stringify(typedData);

      const wrapperSigned = await App.SafeWrapper_Module.signTypedData(
        {
          domain: {
            ...typedData.domain,
            chainId: typedData.domain.chainId ? typedData.domain.chainId?.toString() : null,
          },
          types: typedData.types[],
          value: [],
        },
        client,
        wrapperUri
      );

      const sdkSigned = await ethAdapter.signTypedData(safeTransactionEIP712Args);
      console.log("wrapperSigned", wrapperSigned);
      console.log("sdkSigned", sdkSigned);
    });
  });
});
