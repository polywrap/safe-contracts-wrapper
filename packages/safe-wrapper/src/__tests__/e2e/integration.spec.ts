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
import Safe, { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial, EthAdapter } from '@gnosis.pm/safe-core-sdk-types'
import EthersAdapter, { EthersAdapterConfig } from '@gnosis.pm/safe-ethers-lib';
import { ethers, Wallet } from 'ethers';
import { Signer } from '@ethersproject/abstract-signer'
import { AddressZero } from '@ethersproject/constants'
import {
  Gnosis_safe as GnosisSafe_V1_1_1,
  // Multi_send as MultiSend_V1_1_1,
  // Proxy_factory as ProxyFactory_V1_1_1
} from '@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.1.1'
import { Gnosis_safe as GnosisSafe_V1_2_0 } from '@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.2.0/'
import {
  Gnosis_safe as GnosisSafe_V1_3_0,
  // Multi_send as MultiSend_V1_3_0,
  // Multi_send_call_only as MultiSendCallOnly_V1_3_0,
  // Proxy_factory as ProxyFactory_V1_3_0
} from '@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.3.0/'

import {
  abi as factoryAbi_1_3_0,
  bytecode as factoryBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

import {
  abi as multisendAbi,
  bytecode as multisendBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import {
  abi as multisendCallOnlyAbi,
  bytecode as multisendCallOnlyBytecode,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";

jest.setTimeout(1200000);
describe("Safe Wrapper", () => {
  const wrapper = App.SafeWrapper_Module;
  const factory = App.SafeFactory_Module;
  const connection = { networkNameOrChainId: "testnet" };
  const txOverrides = { gasLimit: "1000000", gasPrice: "20" };
  const signer = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const wallet = new Wallet(
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
  );
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
  let multisendAddress: string;
  let multisendCallOnlyAddress: string;

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

    const multisendResponse =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(multisendAbi),
          bytecode: multisendBytecode,
          args: null,
        },
        client,
        ethereumUri
      );

    if (!multisendResponse.ok) throw multisendResponse.error;
    multisendAddress = multisendResponse.value as string;

    const multisendCallOnlyResponse =
      await App.Ethereum_Module.deployContract(
        {
          abi: JSON.stringify(multisendCallOnlyAbi),
          bytecode: multisendCallOnlyBytecode,
          args: null,
        },
        client,
        ethereumUri
      );

    if (!multisendCallOnlyResponse.ok) throw multisendCallOnlyResponse.error;
    multisendCallOnlyAddress = multisendCallOnlyResponse.value as string;

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

  describe.only('createTransaction', () => {
    const safeVersionDeployed = "1.3.0";

    const setupTests = async () => ({
      accounts: [{
        signer: wallet,
        address: signer
      }],
      contractNetworks: {
        1337: {
          multiSendAddress: multisendAddress,
          multiSendAbi: multisendAbi,
          multiSendCallOnlyAddress: multisendCallOnlyAddress,
          multiSendCallOnlyAbi: multisendCallOnlyAbi,
          safeMasterCopyAddress: safeContractAddress_v130,
          safeMasterCopyAbi: safeAbi_1_3_0,
          safeProxyFactoryAddress: proxyContractAddress_v130,
          safeProxyFactoryAbi: factoryAbi_1_3_0
        }
      }
    })

    const getSafeWithOwners = async (
      owners: string[],
      threshold?: number
    ): Promise<GnosisSafe_V1_3_0 | GnosisSafe_V1_2_0 | GnosisSafe_V1_1_1> => {
      const safe = new ethers.ContractFactory(safeAbi_1_3_0, safeBytecode_1_3_0)
      const template = safe.attach(safeContractAddress_v130);
      return template as GnosisSafe_V1_3_0 | GnosisSafe_V1_2_0 | GnosisSafe_V1_1_1
    }

    const getEthAdapter = async (signer: Signer): Promise<EthAdapter> => {
      let ethAdapter: EthAdapter
      signer = signer.connect(new ethers.providers.JsonRpcProvider(providers.ethereum))
      const ethersAdapterConfig: EthersAdapterConfig = { ethers, signer }
      ethAdapter = new EthersAdapter(ethersAdapterConfig)
      return ethAdapter
    }

    it('should create a single transaction with gasPrice=0', async () => {
      const { accounts, contractNetworks } = await setupTests()
      const [account1] = accounts
      const safe = await getSafeWithOwners([account1.address])
      const ethAdapter = await getEthAdapter(account1.signer)
      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safe.address,
        contractNetworks
      })
      const safeTransactionData: SafeTransactionDataPartial = {
        to: account1.address,
        value: '500000000000000000', // 0.5 ETH
        data: '0x',
        baseGas: 111,
        gasPrice: 0,
        gasToken: '0x333',
        refundReceiver: '0x444',
        nonce: 555,
        safeTxGas: 666
      }
      const tx = await safeSdk.createTransaction({ safeTransactionData })
      expect(tx.data.to).toEqual(account1.address)
      expect(tx.data.value).toEqual('500000000000000000')
      expect(tx.data.data).toEqual('0x')
      expect(tx.data.baseGas).toEqual(111)
      expect(tx.data.gasPrice).toEqual(0)
      expect(tx.data.gasToken).toEqual('0x333')
      expect(tx.data.refundReceiver).toEqual('0x444')
      expect(tx.data.nonce).toEqual(555)
      expect(tx.data.safeTxGas).toEqual(safeVersionDeployed >= '1.3.0' ? 0 : 666)
    })

    it('should create a single transaction with gasPrice=0', async () => {
      const { accounts } = await setupTests()
      const [account1] = accounts;
      const resp = await wrapper.createTransaction(
        {
          tx: {
            to: account1.address,
            value: "500000000000000000", // 0.5 ETH
            data: '0x',
            // baseGas: 111,
            // gasPrice: 0,
            // gasToken: '0x333',
            // refundReceiver: '0x444',
            // nonce: 555,
            // safeTxGas: 666
          }
        },
        client,
        wrapperUri);

      if (!resp.ok) throw resp.error;
      expect(resp.value).not.toBeNull();
      const tx = resp.value;

      expect(tx.to).toEqual(account1.address)
      expect(tx.value).toEqual("500000000000000000")
      expect(tx.data).toEqual('0x')
      // expect(tx.data.baseGas).toEqual(111)
      // expect(tx.data.gasPrice).toEqual(0)
      // expect(tx.data.gasToken).toEqual('0x333')
      // expect(tx.data.refundReceiver).toEqual('0x444')
      // expect(tx.data.nonce).toEqual(555)
      // expect(tx.data.safeTxGas).toEqual(safeVersionDeployed >= '1.3.0' ? 0 : 666)
    })
  })

});
