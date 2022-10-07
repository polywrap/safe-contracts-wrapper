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
          connection,
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
          connection,
        },
        client,
        ethereumUri
      );

    safeContractAddress_v130 = safeFactoryContractResponsev_130.data as string;

    const safeResponse = await App.SafeFactory_Module.deploySafe(
      {
        safeAccountConfig: {
          owners: owners,
          threshold: 1,
        },
        connection,
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
    // TODO: encodeRemoveOwnerData fails when owner count will be less than threshold

    it("encodeSwapOwnerData", async () => {
      const resp = await wrapper.encodeSwapOwnerData({ oldOwnerAddress: owners[0], newOwnerAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });
    // TODO: encodeSwapOwnerData when new owner is already an owner

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
      const data = "0x";
      const a = await App.Ethereum_Module.callContractMethod(
        {
          address: safeAddress,
          method: "function execTransaction( address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures ) public payable virtual returns (bool success)",
          args: [safeAddress, "0", data, "1", "0", "0", "0", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x"],
          connection
        },
        client,
        ethereumUri
      );
      console.log(a)

      const resp = await wrapper.encodeDisableModuleData({ moduleAddress: someAddr }, client, wrapperUri);
      expect(resp).toBeTruthy();
      expect(resp.error).toBeFalsy();
      expect(resp.data).not.toBeNull();
    });
  });
});
