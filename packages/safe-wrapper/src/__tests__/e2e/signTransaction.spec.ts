import path from "path";
import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  stopTestEnvironment,
  providers,
  ensAddresses,
} from "@polywrap/test-env-js";
import * as App from "../types/wrap";
import { getPlugins, setupContractNetworks } from "../utils";
import Safe from "@gnosis.pm/safe-core-sdk";
import { EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import EthersAdapter, { EthersAdapterConfig } from "@gnosis.pm/safe-ethers-lib";
import { ethers, Wallet } from "ethers";
import { Signer } from "@ethersproject/abstract-signer";
import { Gnosis_safe as GnosisSafe_V1_1_1 } from "@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.1.1";
import { Gnosis_safe as GnosisSafe_V1_2_0 } from "@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.2.0/";
import { Gnosis_safe as GnosisSafe_V1_3_0 } from "@gnosis.pm/safe-ethers-lib/dist/typechain/src/ethers-v5/v1.3.0/";

import { abi as factoryAbi_1_3_0 } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json";

import {
  abi as safeAbi_1_3_0,
  bytecode as safeBytecode_1_3_0,
} from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json";

import { abi as multisendAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";

import { abi as multisendCallOnlyAbi } from "@gnosis.pm/safe-contracts_1.3.0/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
//import { SafeWrapper_SafeTransaction } from "../types/wrap";
import { Client } from "@polywrap/core-js";
//@ts-ignore
import { bufferToHex, ecrecover, pubToAddress } from "ethereumjs-util";

jest.setTimeout(1200000);

export function sameString(str1: string, str2: string): boolean {
  return str1.toLowerCase() === str2.toLowerCase();
}
export function isTxHashSignedWithPrefix(
  txHash: string,
  signature: string,
  ownerAddress: string
): boolean {
  let hasPrefix;
  try {
    const rsvSig = {
      r: Buffer.from(signature.slice(2, 66), "hex"),
      s: Buffer.from(signature.slice(66, 130), "hex"),
      v: parseInt(signature.slice(130, 132), 16),
    };
    const recoveredData = ecrecover(
      Buffer.from(txHash.slice(2), "hex"),
      rsvSig.v,
      rsvSig.r,
      rsvSig.s
    );
    const recoveredAddress = bufferToHex(pubToAddress(recoveredData));
    hasPrefix = !sameString(recoveredAddress, ownerAddress);
  } catch (e) {
    hasPrefix = true;
  }
  return hasPrefix;
}

export const adjustVInSignature = (
  signingMethod: "eth_sign" | "eth_signTypedData",
  signature: string,
  safeTxHash?: string,
  signerAddress?: string
): string => {
  const ETHEREUM_V_VALUES = [0, 1, 27, 28];
  const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27;
  let signatureV = parseInt(signature.slice(-2), 16);
  if (!ETHEREUM_V_VALUES.includes(signatureV)) {
    throw new Error("Invalid signature");
  }
  if (signingMethod === "eth_sign") {
    /*
      The Safe's expected V value for ECDSA signature is:
      - 27 or 28
      - 31 or 32 if the message was signed with a EIP-191 prefix. Should be calculated as ECDSA V value + 4
      Some wallets do that, some wallets don't, V > 30 is used by contracts to differentiate between
      prefixed and non-prefixed messages. The only way to know if the message was signed with a
      prefix is to check if the signer address is the same as the recovered address.
      More info:
      https://docs.gnosis-safe.io/contracts/signatures
    */
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
    }
    const adjustedSignature = signature.slice(0, -2) + signatureV.toString(16);
    const signatureHasPrefix = isTxHashSignedWithPrefix(
      safeTxHash as string,
      adjustedSignature,
      signerAddress as string
    );
    if (signatureHasPrefix) {
      signatureV += 4;
    }
  }
  if (signingMethod === "eth_signTypedData") {
    // Metamask with ledger returns V=0/1 here too, we need to adjust it to be ethereum's valid value (27 or 28)
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
    }
  }
  signature = signature.slice(0, -2) + signatureV.toString(16);
  return signature;
};

describe("Safe Wrapper", () => {
  const wallet = new Wallet(
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
  );

  const signer = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";

  const ethereumUri = "ens/ethereum.polywrap.eth";
  let safeAddress: string;

  let client: Client;
  const wrapperPath: string = path.join(
    path.resolve(__dirname),
    "..",
    "..",
    ".."
  );
  const wrapperUri = `fs/${wrapperPath}/build`;

  let proxyContractAddress: string;
  let safeContractAddress: string;
  let multisendAddress: string;
  let multisendCallOnlyAddress: string;

  const ethersProvider = new ethers.providers.JsonRpcProvider(
    providers.ethereum
  );

  const connection = { networkNameOrChainId: "testnet" };

  beforeAll(async () => {
    await initTestEnvironment();

    const network = await ethersProvider.getNetwork();

    connection.networkNameOrChainId = network.chainId.toString();

    const plugins = await getPlugins(
      providers.ethereum,
      providers.ipfs,
      ensAddresses.ensAddress,
      ethersProvider
    );

    client = new PolywrapClient({
      ...plugins,
    }) as unknown as Client;

    [
      safeAddress,
      {
        proxyContractAddress,
        safeContractAddress,
        multisendAddress,
        multisendAddress,
      },
    ] = await setupContractNetworks(client);

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

  describe.only("SignTransaction", () => {
    const setupTests = async () => {
      return {
        accounts: [
          {
            signer: wallet,
            address: signer,
          },
        ],
        contractNetworks: {
          [(await ethersProvider.getNetwork()).chainId]: {
            multiSendAddress: multisendAddress,
            multiSendAbi: multisendAbi,
            multiSendCallOnlyAddress: multisendCallOnlyAddress,
            multiSendCallOnlyAbi: multisendCallOnlyAbi,
            safeMasterCopyAddress: safeContractAddress,
            safeMasterCopyAbi: safeAbi_1_3_0,
            safeProxyFactoryAddress: proxyContractAddress,
            safeProxyFactoryAbi: factoryAbi_1_3_0,
          },
        },
      };
    };

    const getSafeWithOwners = async (
      owners: string[],
      threshold?: number
    ): Promise<GnosisSafe_V1_3_0 | GnosisSafe_V1_2_0 | GnosisSafe_V1_1_1> => {
      const safe = new ethers.ContractFactory(
        safeAbi_1_3_0,
        safeBytecode_1_3_0,
        wallet
      );
      const template = safe.attach(safeContractAddress);
      return template as
        | GnosisSafe_V1_3_0
        | GnosisSafe_V1_2_0
        | GnosisSafe_V1_1_1;
    };

    const getEthAdapter = async (signer: Signer): Promise<EthAdapter> => {
      let ethAdapter: EthAdapter;
      signer = signer.connect(ethersProvider);
      const ethersAdapterConfig: EthersAdapterConfig = { ethers, signer };
      ethAdapter = new EthersAdapter(ethersAdapterConfig);
      return ethAdapter;
    };

    it("should sign transaction SDK-like", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;
      const safe = await getSafeWithOwners([account1.address]);
      const ethAdapter = await getEthAdapter(account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safe.address,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = await ethAdapter.getNonce(account1.address);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: {
          data: "0x",
          value: "50000",
          to: account1.address,
          nonce: nonce + 1,
        },
      });

      /* 
       const result = await App.SafeWrapper_Module.addSignature(
        {
          tx: {
            data: tx.data.data,
            to: tx.data.to,
            value: tx.data.value
          },
        },
        client,
        wrapperUri
      );

      
      console.log("wrapper result", result); */

      const txHash = await safeSdk.getTransactionHash(tx);
      console.log("txHash:", txHash);

      const sdkSigned = await safeSdk.signTransactionHash(txHash);

      const wrapperSigned = await App.SafeWrapper_Module.getHashSignature(
        { hash: txHash },
        client,
        wrapperUri
      );

      //console.log('safeSdk', chaindId)

      /*---------------------- Working example sdkSigned = wrapperSigned

       const ethSigned = await App.Ethereum_Module.signMessage(
        {
          //@ts-ignore
          message: ethers.utils.arrayify(txHash),
        },
        client,
        ethereumUri
      );

      const ethAdjustedSignature = adjustVInSignature(
        "eth_sign",
        //@ts-ignore
        ethSigned.value,
        txHash,
        account1.address
      );
      console.log("ethAdjusted", ethAdjustedSignature);

      expect(sdkSigned.data).toEqual(ethAdjustedSignature); 
      
      
      ------------------------------------------------------------------------*/

      //@ts-ignore
      const signedHash = wrapperSigned.value;

      console.log("wrapperSignature", signedHash);

      const wrapperAdjustedSignature =
        await App.SafeWrapper_Module.adjustSignature(
          {
            signature: signedHash,
            txHash: txHash,
          },
          client,
          wrapperUri
        );

      console.log("sdkSigned", sdkSigned);
      console.log("wrapperAdjustedSignature", wrapperAdjustedSignature);
      expect(sdkSigned.data).toEqual(wrapperAdjustedSignature);
    });

    it.only("Should arraify correctly", async () => {
      const { accounts, contractNetworks } = await setupTests();
      const [account1] = accounts;
      const safe = await getSafeWithOwners([account1.address]);
      const ethAdapter = await getEthAdapter(account1.signer);

      const safeSdk = await Safe.create({
        ethAdapter,
        safeAddress: safe.address,
        //@ts-ignore
        contractNetworks,
      });

      const nonce = await ethAdapter.getNonce(account1.address);

      const tx = await safeSdk.createTransaction({
        safeTransactionData: {
          data: "0x",
          value: "50000",
          to: account1.address,
          nonce: nonce + 1,
        },
      });

      const txHash = await safeSdk.getTransactionHash(tx);

      console.log("txHash: ", txHash);
      /*       const bytesResp = await App.SafeWrapper_Module.getBytesArray(
        { hash: txHash },
        client,
        wrapperUri
      );

      //@ts-ignore
      const bytesArr = bytesResp.value as Uint8Array;

      console.log("wrapperUint8Arr", bytesArr);

      const wrapperHashed = await App.SafeWrapper_Module.getHashedMessage(
        { bytes: bytesArr },
        client,
        wrapperUri
      );

      console.log("wrapperHashed", wrapperHashed); */
      /*  const ethBytes = ethers.utils.arrayify(txHash);
      console.log("ethBytes", ethBytes);
      const ethHashed = ethers.utils.hashMessage(ethBytes);
      console.log("ethHashed", ethHashed);
        */

      const wrapperSigned = await App.SafeWrapper_Module.getHashSignature(
        { hash: txHash },
        client,
        wrapperUri
      );

      //@ts-ignore
      const signedHash = wrapperSigned.value;

      const wrapperAdjustedSignature =
        await App.SafeWrapper_Module.adjustSignature(
          {
            signature: signedHash,
            txHash: txHash,
          },
          client,
          wrapperUri
        );

      console.log("wrapperAdjustedSignature", wrapperAdjustedSignature);

      const sdkSigned = await safeSdk.signTransactionHash(txHash);

      console.log("sdkSigned", sdkSigned);
      //@ts-ignore
      expect(sdkSigned.data).toEqual(wrapperAdjustedSignature.value);
    });
  });
});
