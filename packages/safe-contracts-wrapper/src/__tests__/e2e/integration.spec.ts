import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import path from "path";

import {
  abi as safeProxyFactoryAbi_1_2_0,
  bytecode as safeProxyFactoryBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafeProxyFactory.json";
import {
  abi as safeProxyFactoryAbi_1_3_0,
  bytecode as safeProxyFactoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";
//import { abi as safeAbi_1_2_0, bytecode as safeBytecode_1_2_0 } from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafe.json";
import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";
import { getClientConfig, initInfra, stopInfra } from "../utils";

jest.setTimeout(500000);

describe("ProxyFactory", () => {
  const CONNECTION = { networkNameOrChainId: "testnet" };

  const client = new PolywrapClient(getClientConfig());
  const signer = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";

  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const ethereumUri = "wrap://ens/wraps.eth:ethereum@2.0.0";

  describe("proxies", () => {
    beforeEach(async () => {
      await initInfra();
    });

    afterEach(async () => {
      await stopInfra();
    });

    it("createProxy 1.2.0", async () => {
      const deployContractResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeProxyFactoryAbi_1_2_0),
          bytecode: safeProxyFactoryBytecode_1_2_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

      if (!deployContractResponse.ok) throw deployContractResponse.error;
      expect(deployContractResponse.value).not.toBeNull();

      const contractAddress = deployContractResponse.value as string;

      const initCode = "0x";
      const saltNonce = 42;
      const response = await App.ProxyFactory_Module.createProxy(
        {
          address: contractAddress,
          safeMasterCopyAddress: contractAddress,
          initializer: initCode,
          saltNonce,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(
        "0x0ddb56f661e5bd05fb252f5bc619f74039cd6d63"
      );
    });

    it("createProxy 1.3.0", async () => {
      const singletonResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

      if (!singletonResponse.ok) throw singletonResponse.error;
      const singletonAddress = singletonResponse.value as string;

      const deployContractResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeProxyFactoryAbi_1_3_0),
          bytecode: safeProxyFactoryBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

      if (!deployContractResponse.ok) throw deployContractResponse.error;
      expect(deployContractResponse.value).not.toBeNull();

      const contractAddress = deployContractResponse.value as string;

      const initCode = "0x";
      const saltNonce = 42;
      const response = await App.ProxyFactory_Module.createProxy(
        {
          address: contractAddress,
          safeMasterCopyAddress: singletonAddress,
          initializer: initCode,
          saltNonce,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      // console.log("contract deployed to: ", response)

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(
        "0x0abd1d8cfb1fb79268ea9d29df52d4daa5409842"
      );
    });


    it("proxyCreationCode", async () => {
      const deployContractResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeProxyFactoryAbi_1_3_0),
          bytecode: safeProxyFactoryBytecode_1_3_0,
          args: null,
          connection: CONNECTION
        },
        client,
        ethereumUri
      );

      if (!deployContractResponse.ok) throw deployContractResponse.error;
      expect(deployContractResponse.value).not.toBeNull();

      const contractAddress = deployContractResponse.value as string;

      const response = await App.ProxyFactory_Module.proxyCreationCode(
        {
          address: contractAddress,
          connection: CONNECTION,
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(
        "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564"
      );
    });

    it("estimateGas", async () => {
      const deployContractResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeProxyFactoryAbi_1_3_0),
          bytecode: safeProxyFactoryBytecode_1_3_0,
          args: null,
          connection: CONNECTION
        },
        client,
        ethereumUri
      );

      if (!deployContractResponse.ok) throw deployContractResponse.error;
      expect(deployContractResponse.value).not.toBeNull();

      const contractAddress = deployContractResponse.value as string;

      const initCode = "0x";
      const saltNonce = 42;
      const response = await App.ProxyFactory_Module.estimateGas(
        {
          address: contractAddress,
          method:
            "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
          args: [contractAddress, initCode, saltNonce.toString()],
          connection: CONNECTION,
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(+response.value).toBeGreaterThan(110000);
    });

    it("encode", async () => {
      const contractAddress = "0xf308c38449adef77ae59b3a02b4ea1fa5d1c46e1";
      const initCode = "0x";
      const saltNonce = 42;
      const response = await App.ProxyFactory_Module.encode(
        {
          method:
            "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)",
          args: [contractAddress, initCode, saltNonce.toString()],
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(
        "0x1688f0b9000000000000000000000000f308c38449adef77ae59b3a02b4ea1fa5d1c46e10000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });
  describe("managers", () => {
    let proxyAddress: string;

    beforeEach(async () => {
      await initInfra();

      const singletonResponse = await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
          connection: CONNECTION
        },
        client,
        ethereumUri
      );

      
      if (!singletonResponse.ok) throw singletonResponse.error;
      const singletonAddress = singletonResponse.value as string;
      const safeProxyFactoryResponse = await App.Ethers_Module.deployContract(
          {
            abi: JSON.stringify(safeProxyFactoryAbi_1_3_0),
            bytecode: safeProxyFactoryBytecode_1_3_0,
            args: null,
            connection: CONNECTION
          },
          client,
          ethereumUri
        );
        
        if (!safeProxyFactoryResponse.ok) throw safeProxyFactoryResponse.error;
        const safeProxyFactoryAddress = safeProxyFactoryResponse.value as string;
      const initCode = "0x";
      const saltNonce = 42;
      const proxyResponse = await App.ProxyFactory_Module.createProxy(
        {
          address: safeProxyFactoryAddress,
          safeMasterCopyAddress: singletonAddress,
          initializer: initCode,
          saltNonce,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );
      
      if (!proxyResponse.ok) throw proxyResponse.error;
      proxyAddress = proxyResponse.value as string;

      await App.Ethers_Module.callContractMethodAndWait(
        {
          address: proxyAddress,
          method: "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
          args: [
            "[" + signer + "]",
            "1",
            signer,
            "0x",
            signer,
            signer,
            "0",
            signer,
          ],
          connection: CONNECTION,
          options: {
            gasPrice: "4000000000",
            gasLimit: "200000"
          },
        },
        client,
        ethereumUri
      );
    });

    afterEach(async () => {
      await stopInfra();
    });

    it("getThreshold", async () => {
      const response = await App.ProxyFactory_Module.getThreshold(
        {
          address: proxyAddress,
          connection: CONNECTION
        },
        client,
        wrapperUri,
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(1);
    });

    it("getOwners", async () => {
      const response = await App.ProxyFactory_Module.getOwners(
        {
          address: proxyAddress,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual([signer]);
    });

    it("isOwner", async () => {
      const response = await App.ProxyFactory_Module.isOwner(
        {
          address: proxyAddress,
          ownerAddress: signer,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(true);
    });

    it("getModules", async () => {
      const response = await App.ProxyFactory_Module.getModules(
        {
          address: proxyAddress,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual([]);
    });

    it("isModuleEnabled", async () => {
      const response = await App.ProxyFactory_Module.isModuleEnabled(
        {
          address: proxyAddress,
          moduleAddress: signer,
          connection: CONNECTION
        },
        client,
        wrapperUri
      );

      if (!response.ok) throw response.error;
      expect(response.value).not.toBeNull();
      expect(response.value).toEqual(false);
    });
  });
});
