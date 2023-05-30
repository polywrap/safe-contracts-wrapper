import { PolywrapClient } from "@polywrap/client-js";
import * as App from "../types/wrap";
import path from "path";

import { getClientConfig, initInfra, stopInfra } from "../utils";

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

  const client = new PolywrapClient(getClientConfig());

  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const ethereumUri = "wrap://ens/wraps.eth:ethereum@2.0.0";

  let proxyContractAddress_v120: string;
  let proxyContractAddress_v130: string;
  let safeContractAddress_v120: string;
  let safeContractAddress_v130: string;

  beforeAll(async () => {
    await initInfra();
    /******* Contracts initialization *********/

    const proxyFactoryContractResponse_v120 =
      await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(factoryAbi_1_2_0),
          bytecode: factoryBytecode_1_2_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    if (!proxyFactoryContractResponse_v120.ok)
      throw proxyFactoryContractResponse_v120.error;
    proxyContractAddress_v120 =
      proxyFactoryContractResponse_v120.value as string;

    const safeFactoryContractResponse_v120 =
      await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_2_0),
          bytecode: safeBytecode_1_2_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    if (!safeFactoryContractResponse_v120.ok)
      throw safeFactoryContractResponse_v120.error;
    safeContractAddress_v120 = safeFactoryContractResponse_v120.value as string;

    const proxyFactoryContractResponse_v130 =
      await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(factoryAbi_1_3_0),
          bytecode: factoryBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    if (!proxyFactoryContractResponse_v130.ok)
      throw proxyFactoryContractResponse_v130.error;
    proxyContractAddress_v130 =
      proxyFactoryContractResponse_v130.value as string;

    const safeFactoryContractResponse_v130 =
      await App.Ethers_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
          connection: CONNECTION,
        },
        client,
        ethereumUri
      );

    if (!safeFactoryContractResponse_v130.ok)
      throw safeFactoryContractResponse_v130.error;
    safeContractAddress_v130 = safeFactoryContractResponse_v130.value as string;
  });

  afterAll(async () => {
    await stopInfra();
  });

  describe("deploySafe with custom contract adressess", () => {
    it("should fail if there are no owners", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: [],
              threshold: 1,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.ok).toEqual(false);
      if (!deploySafeResponse.ok) {
        expect(deploySafeResponse.error?.toString()).toMatch(
          "Owner list must have at least one owner"
        );
      }
    });

    it("should fail if the threshold is lower than 0", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: -1,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.ok).toEqual(false);
      if (!deploySafeResponse.ok) {
        expect(deploySafeResponse.error?.toString()).toMatch(
          "unsigned integer cannot be negative"
        );
      }
    });

    it("should fail if the threshold is higher than the owners length", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 2,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.ok).toEqual(false);
      if (!deploySafeResponse.ok) {
        expect(deploySafeResponse.error?.toString()).toMatch(
          "Threshold must be lower than or equal to owners length"
        );
      }
    });

    it("should fail if the saltNonce is lower than 0", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            safeDeploymentConfig: {
              saltNonce: "-2",
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.ok).toEqual(false);
      if (!deploySafeResponse.ok) {
        expect(deploySafeResponse.error?.toString()).toMatch(
          "saltNonce must be greater than or equal to 0"
        );
      }
    });

    it("should deploy a new Safe without saltNonce", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v130!,
              safeFactoryContract: safeContractAddress_v130!,
            },
          },
        },
        client,
        wrapperUri
      );

      if (!deploySafeResponse.ok) throw deploySafeResponse.error;
      expect(deploySafeResponse.value).not.toBeNull();
      expect(deploySafeResponse.value).toMatch("0x");
    });

    it("should deploy a new Safe with saltNonce", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            safeDeploymentConfig: {
              saltNonce: Date.now().toString(),
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      if (!deploySafeResponse.ok) throw deploySafeResponse.error;
      expect(deploySafeResponse.value).not.toBeNull();
      expect(deploySafeResponse.value).toMatch("0x");
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
          customContractAddresses: {
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
          customContractAddresses: {
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
          customContractAddresses: {
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
          input: {
            safeAccountConfig: {
              owners: [],
              threshold: 1,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(predictSafeResp.ok).toEqual(false);
      if (!predictSafeResp.ok) {
        expect(predictSafeResp.error?.toString()).toMatch(
          "Owner list must have at least one owner"
        );
      }
    });

    it("should fail if the threshold is lower than 0", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: -1,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(predictSafeResp.ok).toEqual(false);
      if (!predictSafeResp.ok) {
        expect(predictSafeResp.error?.toString()).toMatch(
          "unsigned integer cannot be negative"
        );
      }
    });

    it("should fail if the threshold is higher than the threshold", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 2,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(predictSafeResp.ok).toEqual(false);
      if (!predictSafeResp.ok) {
        expect(predictSafeResp.error?.toString()).toMatch(
          "Threshold must be lower than or equal to owners length"
        );
      }
    });

    it("should fail if the saltNonce is lower than 0", async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            safeDeploymentConfig: {
              saltNonce: "-2",
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      expect(predictSafeResp.ok).toEqual(false);
      if (!predictSafeResp.ok) {
        expect(predictSafeResp.error?.toString()).toMatch(
          "saltNonce must be greater than or equal to 0"
        );
      }
    });

    it("should predict a new Safe with saltNonce", async () => {
      const saltNonce = "42";
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            safeDeploymentConfig: {
              saltNonce: saltNonce,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      if (!predictSafeResp.ok) throw predictSafeResp.error;
      expect(predictSafeResp.value).not.toBeNull();

      const deploySafeResp = await App.Factory_Module.deploySafe(
        {
          input: {
            safeAccountConfig: {
              owners: owners,
              threshold: 1,
            },
            safeDeploymentConfig: {
              saltNonce: saltNonce,
            },
            connection: CONNECTION,
            customContractAddresses: {
              proxyFactoryContract: proxyContractAddress_v120!,
              safeFactoryContract: safeContractAddress_v120!,
            },
          },
        },
        client,
        wrapperUri
      );

      if (!deploySafeResp.ok) throw deploySafeResp.error;
      expect(deploySafeResp.value).not.toBeNull();

      expect(predictSafeResp.value).toEqual(deploySafeResp.value);
    });
  });
});
