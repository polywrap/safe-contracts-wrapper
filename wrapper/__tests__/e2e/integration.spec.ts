import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import path from "path";

import { getPlugins } from "../utils";
import { abi, bytecode } from "./GnosisSafeProxyFactory";

jest.setTimeout(500000);

describe("SimpleStorage", () => {
  const CONNECTION = { networkNameOrChainId: "testnet" };

  let client: PolywrapClient;

  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build-wrapper`;
  const ethereumUri = "ens/ethereum.polywrap.eth";

  beforeAll(async () => {
    await initTestEnvironment();

    const config = getPlugins(providers.ethereum, providers.ipfs, ensAddresses.ensAddress);
    client = new PolywrapClient(config);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("sanity", async () => {
    // Deploy contract

     const deployContractResponse = await App.Ethereum_Module.deployContract(
       {
       abi,
       bytecode,
       args: null,
       connection: CONNECTION
     },
      client,
      ethereumUri
     );

    const contractAddress = deployContractResponse.data as string;

    console.log(contractAddress)

    expect(deployContractResponse).toBeTruthy();
    expect(deployContractResponse.error).toBeFalsy();
    expect(deployContractResponse.data).toBeTruthy();

    const initCode = "0x";
    const saltNonce = 42;
    // const response =
      await App.SimpleStorage_Module.createProxy(
      {
        address: contractAddress,
        safeMasterCopyAddress: contractAddress,
        initializer: initCode,
        saltNonce,
        connection: CONNECTION,
      },
      client,
      wrapperUri
    );

    // expect(response).toBeTruthy();
    // expect(response.error).toBeFalsy();
    // expect(response.data).not.toBeNull();
  });
});
