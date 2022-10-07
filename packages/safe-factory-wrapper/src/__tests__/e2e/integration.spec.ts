import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses,
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import path from "path";

import { getPlugins } from "../utils";

import {
  abi as factoryAbi_1_2_0,
  bytecode as factoryBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafeProxyFactory.json";

import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_2_0,
  bytecode as safeBytecode_1_2_0,
} from "@gnosis.pm/safe-contracts_1.2.0/build/contracts/GnosisSafe.json";

import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

jest.setTimeout(500000);

const owners = ["0xd405aebF7b60eD2cb2Ac4497Bddd292DEe534E82"];

describe("SafeFactory", () => {
  const CONNECTION = { networkNameOrChainId: "testnet" };

  let client: PolywrapClient;

  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const ethereumUri = "ens/ethereum.polywrap.eth";

  let proxyContractAddress_v120: string;
  let proxyContractAddress_v130: string;
  let safeContractAddress_v120: string;
  let safeContractAddress_v130: string;

  beforeAll(async () => {
    await initTestEnvironment();

    const config = getPlugins(
      providers.ethereum,
      providers.ipfs,
      ensAddresses.ensAddress
    );

    client = new PolywrapClient(config);

    /******* Contracts initialization *********/

    const proxyFactoryContractResponse_v120 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(factoryAbi_1_2_0),
          bytecode: factoryBytecode_1_2_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    const safeFactoryContractResponsev_120 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_2_0),
          bytecode: safeBytecode_1_2_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );
    const proxyFactoryContractResponse_v130 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(factoryAbi_1_3_0),
          bytecode: factoryBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    const safeFactoryContractResponsev_130 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    proxyContractAddress_v120 =
      proxyFactoryContractResponse_v120.data as string;

    safeContractAddress_v120 = safeFactoryContractResponsev_120.data as string;

    proxyContractAddress_v130 =
      proxyFactoryContractResponse_v130.data as string;

    safeContractAddress_v130 = safeFactoryContractResponsev_130.data as string;
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  describe("getChainId", () => {
    it("should return the chainId of the current network", async () => {
      const chainIdResponse = await App.Factory_Module.getChainId(
        {
          connection: CONNECTION,
        },
        client,
        wrapperUri
      );

      expect(chainIdResponse).toBeTruthy();
      expect(chainIdResponse.data).toBeTruthy();
      expect(chainIdResponse.error).toBeFalsy();
    });
  });

  describe("deploySafe with custom contract adressess", () => {
    it("should fail if there are no owners", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: [],
            threshold: 1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });

    it("should fail if the threshold is lower than 0", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: -1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });

    it("should fail if the threshold is higher than the owners length", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 2,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });

    it("should fail if the saltNonce is lower than 0", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 2,
          },
          safeDeploymentConfig: {
            saltNonce: "-2",
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });

    it("should deploy a new Safe without saltNonce", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v130!,
            safeFactoryContract: safeContractAddress_v130!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeFalsy();
      expect(deploySafeResponse.data).toBeTruthy();
    });

    it("should deploy a new Safe with saltNonce", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: Date.now().toString(),
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeFalsy();
      expect(deploySafeResponse.data).toBeTruthy();
    });

    // redundant ?
    /* it("should deploy last Safe version by default (through custom contract address)", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v130!,
            safeFactoryContract: safeContractAddress_v130!,
          },
        },
        client,
        wrapperUri
      );
        console.log('deploySafeResponse', deploySafeResponse)
      expect(deploySafeResponse.data).toBeTruthy();
      expect(deploySafeResponse.error).toBeFalsy();
    }); */

    // redundant ?
    /* it("should fail a specific Safe version on unsupported chain (through custom contract address)", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: Date.now().toString(),
            version: "1.2.0",
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });  */

    // redundant ?
    /* it("should deploy a specific Safe version", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: Date.now().toString(),
            version: "1.3.0",
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v130!,
            safeFactoryContract: safeContractAddress_v130!,
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeFalsy();
      expect(deploySafeResponse.data).toBeTruthy();
    }); */
  });

  describe("predictSafeAddress", () => {
    it("should fail if there are no owners", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: [],
            threshold: 1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it("should fail if the threshold is lower than 0", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: -1,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it("should fail if the threshold is higher than the threshold", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 2,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it("should fail if the saltNonce is lower than 0", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 2,
          },
          safeDeploymentConfig: {
            saltNonce: "-2",
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it("should predict a new Safe with saltNonce", async () => {
      const saltNonce = "0x127";
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: saltNonce,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      const deploySafeResp = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: saltNonce,
          },
          connection: CONNECTION,
          customContractAdressess: {
            proxyFactoryContract: proxyContractAddress_v120!,
            safeFactoryContract: safeContractAddress_v120!,
          },
        },
        client,
        wrapperUri
      );
      console.log("predictSafeResp", predictSafeResp);
      console.log("deploySafeResp", deploySafeResp);
      expect(predictSafeResp.error).toBeFalsy();
      expect(predictSafeResp.data).toBeTruthy();
      expect(predictSafeResp.data).toEqual(
        deploySafeResp.data?.safeAddress.toLowerCase()
      );
    });
  });
});
