import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import { initTestEnvironment, stopTestEnvironment, providers, ensAddresses } from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupAccounts, setupContractNetworks } from "../utils";
import { ethers } from "ethers";

import { Client } from "@polywrap/core-js";

jest.setTimeout(1200000);
describe("Safe Wrapper", () => {
  const wrapper = App.SafeWrapper_Module;
  const connection = { networkNameOrChainId: "testnet" };
  const someAddr = "0x8dc847af872947ac18d5d63fa646eb65d4d99560";

  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(path.resolve(__dirname), "..", "..", "..");
  const wrapperUri = `fs/${wrapperPath}/build`;

  const ethersProvider = new ethers.providers.JsonRpcProvider(providers.ethereum);

  const [account1, account2] = setupAccounts();

  beforeAll(async () => {
    await initTestEnvironment();

    const network = await ethersProvider.getNetwork();

    connection.networkNameOrChainId = network.chainId.toString();

    const plugins = await getPlugins(providers.ethereum, providers.ipfs, ensAddresses.ensAddress, connection.networkNameOrChainId);

    client = new PolywrapClient({
      ...plugins,
    }) as unknown as Client;

    [safeAddress] = await setupContractNetworks(client);

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

  describe("Owner Manager", () => {
    it("getOwners", async () => {
      const resp = await wrapper.getOwners({}, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value!.map((a: any) => a.toLowerCase())).toEqual([account1, account2].map((a) => a.address.toLowerCase()));
    });

    it("getThreshold", async () => {
      const resp = await wrapper.getThreshold({}, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).toEqual(1);
    });

    it("isOwner", async () => {
      const resp = await wrapper.isOwner({ ownerAddress: account1.address }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).toEqual(true);
    });

    it("encodeAddOwnerWithThresholdData", async () => {
      const resp = await wrapper.encodeAddOwnerWithThresholdData({ ownerAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeRemoveOwnerData", async () => {
      const resp = await wrapper.encodeRemoveOwnerData({ ownerAddress: account1.address }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeSwapOwnerData", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: account1.address, newOwnerAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeSwapOwnerData fails", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: account1.address, newOwnerAddress: account1.address }, client, wrapperUri);

      if (!resp.ok) {
        expect(resp.error?.toString()).toContain("Address provided is already an owner");
      }
    });

    it("encodeChangeThresholdData", async () => {
      const resp = await wrapper.encodeChangeThresholdData({ threshold: 2 }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });
  });

  describe("Module Manager", () => {
    it("getModules", async () => {
      const resp = await wrapper.getModules({}, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
      expect(resp.value).toEqual([]);
    });

    it("isModuleEnabled", async () => {
      const resp = await wrapper.isModuleEnabled({ moduleAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
      expect(resp.value).toEqual(false);
    });

    it("encodeEnableModuleData", async () => {
      const resp = await wrapper.encodeEnableModuleData({ moduleAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeDisableModuleData", async () => {
      const resp = await wrapper.encodeDisableModuleData({ moduleAddress: someAddr }, client, wrapperUri);
      if (!resp.ok) {
        expect(resp.error?.toString()).toMatch("Module provided is not enabled yet");
      }
    });
  });
});
