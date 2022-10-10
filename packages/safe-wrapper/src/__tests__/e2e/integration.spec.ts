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

import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

jest.setTimeout(1200000);
describe("Safe Wrapper", () => {
  const wrapper = App.SafeWrapper_Module;
  const factory = App.SafeFactory_Module;
  const connection = { networkNameOrChainId: "testnet" };
  const txOverrides = { gasLimit: "1000000", gasPrice: "20" };
  const signer = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const owner = "0xEc8E7Da193529bd8ddA13b1995F93F32989CF097";
  const owners = [signer, owner];
  const someAddr = "0x8dc847af872947ac18d5d63fa646eb65d4d99560";
  const ethereumUri = "ens/ethereum.polywrap.eth";
  let safeAddress: string;

  let client: PolywrapClient;
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

    let proxyContractAddress_v130: string;
      let safeContractAddress_v130: string;
      
  beforeAll(async () => {
    await initTestEnvironment();

    const plugins = getPlugins(
      providers.ethereum,
      ensAddresses.ensAddress,
      connection.networkNameOrChainId
    );

    client = new PolywrapClient(plugins);

    const proxyFactoryContractResponse_v130 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(factoryAbi_1_3_0),
          bytecode: factoryBytecode_1_3_0,
          args: null,
        },
        client,
        ethereumUri
      );

    proxyContractAddress_v130 =
      proxyFactoryContractResponse_v130.data as string;

    const safeFactoryContractResponsev_130 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
        },
        client,
        ethereumUri
      );

    safeContractAddress_v130 = safeFactoryContractResponsev_130.data as string;

    const safeResponse = await factory.deploySafe(
      {
        safeAccountConfig: {
          owners: owners,
          threshold: 1,
        },
	txOverrides,
        customContractAdressess: {
          proxyFactoryContract: proxyContractAddress_v130!,
          safeFactoryContract: safeContractAddress_v130!,
        },
      },
      client,
      safeWrapperUri
    );

    safeAddress = safeResponse.data!.safeAddress;

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
      expect(resp.data!.map(a => a.toLowerCase())).toEqual(owners.map(a => a.toLowerCase()));
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

    it("encodeSwapOwnerData fails", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: owners[0], newOwnerAddress: owners[1] }, client, wrapperUri);
      expect(resp.error?.toString()).toContain("Address provided is already an owner");
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
      expect(resp.error?.toString()).toContain("Module provided is not enabled yet");
    });
  });
});
