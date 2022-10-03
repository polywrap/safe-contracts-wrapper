import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses,
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins } from "../utils";

jest.setTimeout(1200000);
describe("Safe Wrapper", () => {
  const wrapper = App.SafeWrapper_Module;
  const connection = { networkNameOrChainId: "goerli" };
  const txOverrides = { gasLimit: "1000000", gasPrice: "20" };
  const owners = ["0xd405aebF7b60eD2cb2Ac4497Bddd292DEe534E82"];
  const someAddr = "0x8dc847af872947ac18d5d63fa646eb65d4d99560";

  let client: PolywrapClient;
  let safeAddress: string;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;
  const safeWrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    "..",
    "..",
    "safe-factory-wrapper"
  );
  const safeWrapperUri = `fs/${safeWrapperPath}/build`;

  beforeAll(async () => {
    await initTestEnvironment();

    const plugins = getPlugins(
      providers.ethereum,
      ensAddresses.ensAddress,
      connection.networkNameOrChainId
    );
    safeAddress = (await App.SafeFactory_Module.deploySafe(
      {
        safeAccountConfig: {
          owners: owners,
          threshold: 1,
        },
        connection: connection,
        txOverrides: txOverrides,
      },
      new PolywrapClient(plugins),
      safeWrapperUri
    )).data!.safeAddress;
    client = new PolywrapClient({
      ...plugins,
      envs: [{
        uri: wrapperUri,
        env: {
          safeAddress: safeAddress,
          connection: connection,
        }
      }]
    })
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  describe("Owner Manager", () => {
    it("getOwners", async () => {
      const resp = await wrapper.getOwners({}, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
      expect(resp.data).toEqual(owners);
    });

    it("getThreshold", async () => {
      const resp = await wrapper.getThreshold({}, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
      expect(resp.data).toEqual(1);
    });

    it("isOwner", async () => {
      const resp = await wrapper.isOwner({ ownerAddress: owners[0] }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
      expect(resp.data).toEqual(true);
    });

    it("encodeAddOwnerWithThresholdData", async () => {
      const resp = await wrapper.encodeAddOwnerWithThresholdData({ ownerAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });

    it("encodeRemoveOwnerData", async () => {
      const resp = await wrapper.encodeRemoveOwnerData({ ownerAddress: owners[0] }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });

    it("encodeSwapOwnerData", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: owners[0], newOwnerAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });

    it("encodeChangeThresholdData", async () => {
      const resp = await wrapper.encodeChangeThresholdData({ threshold: 2 }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });
  });

  describe("Module Manager", () => {
    it("getModules", async () => {
      const resp = await wrapper.getModules({}, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
      expect(resp.data).toEqual([]);
    });

    it("isModuleEnabled", async () => {
      const resp = await wrapper.isModuleEnabled({ moduleAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
      expect(resp.data).toEqual(false);
    });

    it("encodeEnableModuleData", async () => {
      const resp = await wrapper.encodeEnableModuleData({ moduleAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });

    it("encodeDisableModuleData", async () => {
      const resp = await wrapper.encodeDisableModuleData({ moduleAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });
  });
});
