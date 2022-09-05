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

describe("ProxyFactory", () => {
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

  it("createProxy", async () => {

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

    expect(deployContractResponse).toBeTruthy();
    expect(deployContractResponse.error).toBeFalsy();
    expect(deployContractResponse.data).toBeTruthy();

    const initCode = "0x";
    const saltNonce = 42;
    const response = await App.ProxyFactory_Module.createProxy(
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

    expect(response).toBeTruthy();
    expect(response.error).toBeFalsy();
    expect(response.data).not.toBeNull();
    expect(response.data).toEqual("0xf308c38449adef77ae59b3a02b4ea1fa5d1c46e1");
  });

  it("proxyCreationCode", async () => {

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

    expect(deployContractResponse).toBeTruthy();
    expect(deployContractResponse.error).toBeFalsy();
    expect(deployContractResponse.data).toBeTruthy();

    const response = await App.ProxyFactory_Module.proxyCreationCode(
      {
        address: contractAddress,
        connection: CONNECTION,
      },
      client,
      wrapperUri
    );

    expect(response).toBeTruthy();
    expect(response.error).toBeFalsy();
    expect(response.data).not.toBeNull();
    expect(response.data).toEqual("0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea26469706673582212201e33c75ec5a86b4d80c9516b3349a89d5d6c2e5232dbbbb68ec679307d136e0364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564");
  });

  it("estimateGas", async () => {

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

    expect(deployContractResponse).toBeTruthy();
    expect(deployContractResponse.error).toBeFalsy();
    expect(deployContractResponse.data).toBeTruthy();

    const initCode = "0x";
    const saltNonce = 42;
    const response = await App.ProxyFactory_Module.estimateGas(
      {
        address: contractAddress,
	method: "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
	args: [contractAddress, initCode, saltNonce.toString()],
        connection: CONNECTION,
      },
      client,
      wrapperUri
    );

    expect(response).toBeTruthy();
    expect(response.error).toBeFalsy();
    expect(response.data).not.toBeNull();
    expect(response.data).toEqual("113499");
  });

  it("encode", async () => {

    const contractAddress = "0xf308c38449adef77ae59b3a02b4ea1fa5d1c46e1";
    const initCode = "0x";
    const saltNonce = 42;
    const response = await App.ProxyFactory_Module.encode(
      {
	method: "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
	args: [contractAddress, initCode, saltNonce.toString()],
      },
      client,
      wrapperUri
    );

    expect(response).toBeTruthy();
    expect(response.error).toBeFalsy();
    expect(response.data).not.toBeNull();
    expect(response.data).toEqual("0x1688f0b90000000000000000000000009b1f7f645351af3631a656421ed2e40f2802e6c00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000000");
  });
});
