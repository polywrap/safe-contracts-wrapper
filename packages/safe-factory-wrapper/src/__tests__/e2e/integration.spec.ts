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

jest.setTimeout(500000);

//export const itif = (condition: boolean) => (condition ? it : it.skip)

export const SAFE_LAST_VERSION = "1.3.0";
export const SAFE_BASE_VERSION = "1.1.1";

const txOverrides = { gasLimit: "1000000", gasPrice: "20" };
const owners = ["0xd405aebF7b60eD2cb2Ac4497Bddd292DEe534E82"];

describe("SafeFactory", () => {
  const CONNECTION = { networkNameOrChainId: "ropsten" };

  let client: PolywrapClient;

  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  beforeAll(async () => {
    await initTestEnvironment();

    const config = getPlugins(
      providers.ethereum,
      ensAddresses.ensAddress,
      CONNECTION.networkNameOrChainId
    );
    client = new PolywrapClient(config);
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

  describe("deploySafe", () => {
    it("should fail if there are no owners", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: [],
            threshold: 1,
          },
          connection: CONNECTION,
          txOverrides: txOverrides,
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
          txOverrides: txOverrides,
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
          txOverrides: txOverrides,
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
          txOverrides: txOverrides,
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
          txOverrides: txOverrides,
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
          txOverrides: txOverrides,
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeFalsy();
      expect(deploySafeResponse.data).toBeTruthy();
    });

    it("should deploy last Safe version by default", async () => {
      const deploySafeResponse = await App.Factory_Module.deploySafe(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 1,
          },
          connection: CONNECTION,
          txOverrides: txOverrides,
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.data).toBeTruthy();
      expect(deploySafeResponse.error).toBeFalsy();
    });

    it("should fail a specific Safe version on unsupported chain", async () => {
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
          txOverrides: txOverrides,
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeTruthy();
      expect(deploySafeResponse.data).toBeFalsy();
    });

    it("should deploy a specific Safe version", async () => {
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
          txOverrides: txOverrides,
        },
        client,
        wrapperUri
      );

      expect(deploySafeResponse.error).toBeFalsy();
      expect(deploySafeResponse.data).toBeTruthy();
    });
  });

  describe('predictSafeAddress', () => {
    it('should fail if there are no owners', async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: [],
            threshold: 1,
          },
          connection: CONNECTION,
        },
        client,
        wrapperUri
      )
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it('should fail if the threshold is lower than 0', async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: -1,
          },
          connection: CONNECTION,
        },
        client,
        wrapperUri
      )
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it('should fail if the threshold is higher than the threshold', async () => {
      const predictSafeResp = await App.Factory_Module.predictSafeAddress(
        {
          safeAccountConfig: {
            owners: owners,
            threshold: 2,
          },
          connection: CONNECTION,
        },
        client,
        wrapperUri
      )
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it('should fail if the saltNonce is lower than 0', async () => {
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
        },
        client,
        wrapperUri
      )
      expect(predictSafeResp.error).toBeTruthy();
      expect(predictSafeResp.data).toBeFalsy();
    });

    it('should predict a new Safe with saltNonce', async () =>  {
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
        },
        client,
        wrapperUri
      )
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
          txOverrides: txOverrides,
        },
        client,
        wrapperUri
      );
      console.log("predictSafeResp", predictSafeResp);
      console.log("deploySafeResp", deploySafeResp);
      expect(predictSafeResp.error).toBeFalsy();
      expect(predictSafeResp.data).toBeTruthy();
      expect(predictSafeResp.data).toEqual(deploySafeResp.data?.safeAddress.toLowerCase());
    });
  });
});
