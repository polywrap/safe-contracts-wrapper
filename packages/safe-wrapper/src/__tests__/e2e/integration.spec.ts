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
// import Safe from '@gnosis.pm/safe-core-sdk'

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
      providers.ipfs,
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

    if (!proxyFactoryContractResponse_v130.ok) throw proxyFactoryContractResponse_v130.error;
    proxyContractAddress_v130 =
      proxyFactoryContractResponse_v130.value as string;

    const safeFactoryContractResponse_v130 =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(safeAbi_1_3_0),
          bytecode: safeBytecode_1_3_0,
          args: null,
        },
        client,
        ethereumUri
      );

    if (!safeFactoryContractResponse_v130.ok) throw safeFactoryContractResponse_v130.error;
    safeContractAddress_v130 = safeFactoryContractResponse_v130.value as string;

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

    if (!safeResponse.ok) throw safeResponse.error;
    safeAddress = safeResponse.value!.safeAddress;

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

      if (!resp.ok) throw resp.error;
      expect(resp.value!.map((a: any) => a.toLowerCase())).toEqual(owners.map(a => a.toLowerCase()));
    });

    it("getThreshold", async () => {
      const resp = await wrapper.getThreshold({}, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).toEqual(1);
    });

    it("isOwner", async () => {
      const resp = await wrapper.isOwner({ ownerAddress: owners[0] }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).toEqual(true);
    });

    it("encodeAddOwnerWithThresholdData", async () => {
      const resp = await wrapper.encodeAddOwnerWithThresholdData({ ownerAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeRemoveOwnerData", async () => {
      const resp = await wrapper.encodeRemoveOwnerData({ ownerAddress: owners[0] }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeSwapOwnerData", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: owners[0], newOwnerAddress: someAddr }, client, wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
    });

    it("encodeSwapOwnerData fails", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: owners[0], newOwnerAddress: owners[1] }, client, wrapperUri);

      if (!resp.ok) {
        expect(resp.error?.toString()).toMatch("Address provided is already an owner");
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
