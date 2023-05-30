import {
  Args_createTransaction,
  Args_addSignature,
  Env,
  Ethers_Module,
  SafeContracts_Module,
  Ethers_TxReceipt,
  SafeContracts_Ethers_TxOptions,
  SafeTransactionData,
  SignSignature,
  SafeTransaction,
  Ethers_TxOptions,
  EthersUtils_Module,
  Args_encodeMultiSendData,
  Args_getSignature,
} from "./wrap";
import { Args_getTransactionHash, ModuleBase } from "./wrap/Module";
import {
  adjustVInSignature,
  arrayify,
  createTransactionFromPartial,
  encodeMultiSendData as encodeMultiSendDataInternal,
  generatePreValidatedSignature,
} from "./utils";
import {
  Args_approveTransactionHash,
  Args_createMultiSendTransaction,
  Args_encodeAddOwnerWithThresholdData,
  Args_encodeChangeThresholdData,
  Args_encodeDisableModuleData,
  Args_encodeEnableModuleData,
  Args_encodeRemoveOwnerData,
  Args_encodeSwapOwnerData,
  Args_executeTransaction,
  Args_getAddress,
  Args_getBalance,
  Args_getChainId,
  Args_getContractVersion,
  Args_getModules,
  Args_getNonce,
  Args_getOwners,
  Args_getOwnersWhoApprovedTx,
  Args_getThreshold,
  Args_isModuleEnabled,
  Args_isOwner,
  Args_signTransactionHash,
  Args_signTypedData,
} from "./wrap/Module/serialization";
import { BigInt, Box, JSON } from "@polywrap/wasm-as";
import { generateTypedData, toJsonTypedData } from "./utils/typedData";

import * as ownerManager from "./managers/ownerManager";
import * as contractManager from "./managers/contractManager";
import { toTransaction, toTransactionData, toTxReceipt } from "./utils/typeMap";
import {
  encodeDisableModuleData,
  encodeEnableModuleData,
  getModules,
  isModuleEnabled,
} from "./managers";

export * from "./managers";

export class Module extends ModuleBase {
  createTransaction(args: Args_createTransaction, env: Env): SafeTransaction {
    const transactionData = createTransactionFromPartial(args.tx, args.options);

    return {
      data: transactionData,
      signatures: new Map<string, SignSignature>(),
    };
  }

  createMultiSendTransaction(
    args: Args_createMultiSendTransaction,
    env: Env
  ): SafeTransaction {
    if (args.txs.length == 0) {
      throw new Error("Invalid empty array of transactions");
    }

    if (args.txs.length == 1) {
      return this.createTransaction(
        { tx: args.txs[0], options: args.options },
        env
      );
    }

    const multiSendData = encodeMultiSendDataInternal(args.txs);

    const data = EthersUtils_Module.encodeFunction({
      method: "function multiSend(bytes transactions)",
      args: [multiSendData],
    }).unwrap();

    const transactionData = createTransactionFromPartial(
      { data: "", to: "", value: BigInt.from("") } as SafeTransactionData,
      null
    );

    let multiSendAddress: string = "";

    if (args.customMultiSendContractAddress != null) {
      multiSendAddress = args.customMultiSendContractAddress!;
    } else {
      const chainId = Ethers_Module.getChainId({
        connection: env.connection,
      }).unwrap();
      const isL1Safe = true; // TODO figure out how get it from safe
      const version = contractManager.getContractVersion({}, env);
      const contractNetworks = SafeContracts_Module.getSafeContractNetworks({
        chainId,
        isL1Safe: Box.from(isL1Safe),
        version: version,
        filter: {
          safeMasterCopyAddress: false,
          safeProxyFactoryAddress: false,
          multiSendAddress: true,
          multiSendCallOnlyAddress: true,
          fallbackHandlerAddress: true,
        },
      }).unwrap();

      if (args.onlyCalls) {
        multiSendAddress = contractNetworks.multiSendCallOnlyAddress!;
      } else {
        multiSendAddress = contractNetworks.multiSendAddress!;
      }
    }

    const multiSendTransaction: SafeTransactionData = {
      to: multiSendAddress,
      value: BigInt.from("0"),
      data: data,
      operation: BigInt.from("1"), // OperationType.DelegateCall,
      baseGas:
        args.options != null && args.options!.baseGas
          ? args.options!.baseGas
          : transactionData.baseGas,
      gasPrice:
        args.options != null && args.options!.gasPrice
          ? args.options!.gasPrice
          : transactionData.gasPrice,
      gasToken:
        args.options != null && args.options!.gasToken
          ? args.options!.gasToken
          : transactionData.gasToken,
      nonce:
        args.options != null && args.options!.nonce
          ? args.options!.nonce
          : transactionData.nonce,
      refundReceiver:
        args.options != null && args.options!.refundReceiver
          ? args.options!.refundReceiver
          : transactionData.refundReceiver,
      safeTxGas:
        args.options != null && args.options!.safeTxGas
          ? args.options!.safeTxGas
          : transactionData.safeTxGas,
    };

    return {
      data: multiSendTransaction,
      signatures: new Map<string, SignSignature>(),
    };
  }

  addSignature(args: Args_addSignature, env: Env): SafeTransaction {
    const signerAddress = Ethers_Module.getSignerAddress({
      connection: {
        node: env.connection.node,
        networkNameOrChainId: env.connection.networkNameOrChainId,
      },
    }).unwrap();

    const addressIsOwner = ownerManager.isOwner(
      { ownerAddress: signerAddress },
      env
    );

    if (addressIsOwner == false) {
      throw new Error("Transactions can only be signed by Safe owners");
    }

    let signatures = args.tx.signatures;

    //If signature of current signer is already present - return transaction
    if (signatures != null) {
      if (signatures.has(signerAddress)) {
        return args.tx;
      }
    }

    //If no signatures - create signatures map
    if (signatures == null) {
      signatures = new Map<string, SignSignature>();
    }
    if (
      args.signingMethod != null &&
      args.signingMethod! == "eth_signTypedData"
    ) {
      const signature = this.signTypedData({ tx: args.tx.data }, env);
      signatures.set(signerAddress, signature);
    } else {
      const transactionHash = this.getTransactionHash(
        { tx: args.tx.data },
        env
      );
      const signature = this.signTransactionHash(
        { hash: transactionHash },
        env
      );
      signatures.set(signerAddress, signature);
    }
    //Add signature of current signer
    args.tx.signatures = signatures;

    return args.tx;
  }

  getSignature(args: Args_getSignature): SafeTransaction {
    const signerAddress = Ethers_Module.getSignerAddress({
      connection: {
        node: args.connection.node,
        networkNameOrChainId: args.connection.networkNameOrChainId,
      },
    }).unwrap();

    let signatures = args.tx.signatures;

    //If signature of current signer is already present - return transaction
    if (signatures != null) {
      if (signatures.has(signerAddress)) {
        return args.tx;
      }
    }

    const chainId = Ethers_Module.getChainId({
      connection: args.connection,
    }).unwrap();
    const recreatedTx = createTransactionFromPartial(args.tx.data, null);

    //If no signatures - create signatures map
    if (signatures == null) {
      signatures = new Map<string, SignSignature>();
    }

    const typedData = generateTypedData(
      args.safeAddress,
      "1.3.0",
      chainId,
      recreatedTx
    );
    const payload = toJsonTypedData(typedData) as JSON.Obj;

    const signature = Ethers_Module.signTypedData({
      payload,
      connection: args.connection,
    }).unwrap();

    signatures.set(signerAddress, {
      signer: signerAddress,
      data: adjustVInSignature("eth_signTypedData", signature, null, null),
    });

    //Add signature of current signer
    args.tx.signatures = signatures;

    return args.tx;
  }

  getTransactionHash(args: Args_getTransactionHash, env: Env): string {
    return SafeContracts_Module.getTransactionHash({
      safeAddress: env.safeAddress,
      safeTransactionData: toTransactionData(args.tx),
      connection: {
        networkNameOrChainId: env.connection.networkNameOrChainId,
        node: env.connection.node,
      },
    }).unwrap();
  }

  signTransactionHash(args: Args_signTransactionHash, env: Env): SignSignature {
    const signer = Ethers_Module.getSignerAddress({
      connection: env.connection,
    }).unwrap();

    const byteArray = arrayify(args.hash).buffer;

    // TODO polywrap ethereum-plugin implementation required
    const signature = Ethers_Module.signMessageBytes({
      bytes: byteArray,
      connection: {
        node: env.connection.node,
        networkNameOrChainId: env.connection.networkNameOrChainId,
      },
    }).unwrap();

    const adjustedSignature = adjustVInSignature(
      "eth_sign",
      signature,
      args.hash,
      signer
    );

    return { signer: signer, data: adjustedSignature };
  }

  approveTransactionHash(
    args: Args_approveTransactionHash,
    env: Env
  ): Ethers_TxReceipt {
    const signerAddress = Ethers_Module.getSignerAddress({
      connection: env.connection,
    }).unwrap();

    const addressIsOwner = ownerManager.isOwner(
      { ownerAddress: signerAddress },
      env
    );

    if (!addressIsOwner) {
      throw new Error("Transaction hashes can only be approved by Safe owners");
    }

    const options: Ethers_TxOptions = {
      gasPrice: null,
      nonce: null,
      value: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasLimit: null,
    };

    if (args.options) {
      if (args.options!.gasPrice) {
        options.gasPrice = args.options!.gasPrice;
      }

      if (args.options!.gasLimit) {
        options.gasLimit = args.options!.gasLimit;
      }
    }

    if (!options.gasLimit) {
      options.gasLimit = Ethers_Module.estimateContractCallGas({
        method: "function approveHash(bytes32 hashToApprove)",
        address: env.safeAddress,
        args: [args.hash],
        connection: env.connection,
        options: null,
      }).unwrap();
    }

    const response = Ethers_Module.callContractMethodAndWait({
      method: "function approveHash(bytes32 hashToApprove)",
      address: env.safeAddress,
      args: [args.hash],
      connection: env.connection,
      options,
    }).unwrap();

    return response;
  }

  getOwnersWhoApprovedTx(
    args: Args_getOwnersWhoApprovedTx,
    env: Env
  ): string[] {
    const owners = ownerManager.getOwners({}, env);
    const ownersWhoApproved: string[] = [];

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      const approved = contractManager.approvedHashes(args.hash, owner, env);
      if (approved.gt(0)) {
        ownersWhoApproved.push(owner);
      }
    }
    return ownersWhoApproved;
  }

  signTypedData(args: Args_signTypedData, env: Env): SignSignature {
    const recreatedTx = createTransactionFromPartial(args.tx, null);

    const safeVersion = contractManager.getContractVersion({}, env);

    const chainId = Ethers_Module.getChainId({
      connection: env.connection,
    }).unwrap();

    const typedData = generateTypedData(
      env.safeAddress,
      safeVersion,
      chainId,
      recreatedTx
    );
    const jsonTypedData = toJsonTypedData(typedData);

    const signature = Ethers_Module.signTypedData({
      payload: jsonTypedData,
      connection: env.connection,
    }).unwrap();

    return {
      signer: Ethers_Module.getSignerAddress({
        connection: env.connection,
      }).unwrap(),
      data: adjustVInSignature("eth_signTypedData", signature, null, null),
    };
  }

  executeTransaction(
    args: Args_executeTransaction,
    env: Env
  ): Ethers_TxReceipt {
    const transaction = args.tx;

    const signedSafeTransaction = this.createTransaction(
      { tx: args.tx.data, options: null },
      env
    );

    for (let i = 0; i < transaction.signatures!.keys().length; i++) {
      const key = transaction.signatures!.keys()[i];

      const signature = transaction.signatures!.get(key);

      signedSafeTransaction.signatures!.set(
        signature.signer.toLowerCase(),
        signature
      );
    }

    const txHash = this.getTransactionHash(
      { tx: signedSafeTransaction.data },
      env
    );

    const ownersWhoApprovedTx = this.getOwnersWhoApprovedTx(
      { hash: txHash },
      env
    );
    for (let i = 0; i < ownersWhoApprovedTx.length; i++) {
      const owner = ownersWhoApprovedTx[i];
      signedSafeTransaction.signatures!.set(
        owner.toLowerCase(),
        generatePreValidatedSignature(owner)
      );
    }

    const owners = ownerManager.getOwners({}, env);

    const signerAddress = Ethers_Module.getSignerAddress({
      connection: env.connection,
    }).unwrap();

    if (owners.includes(signerAddress)) {
      signedSafeTransaction.signatures!.set(
        signerAddress.toLowerCase(),
        generatePreValidatedSignature(signerAddress)
      );
    }

    const threshold = ownerManager.getThreshold({}, env);

    if (threshold > <u32>signedSafeTransaction.signatures!.size) {
      const signaturesMissing =
        threshold - signedSafeTransaction.signatures!.size;
      throw new Error(
        `There ${
          signaturesMissing > 1 ? "are" : "is"
        } ${signaturesMissing} signature${
          signaturesMissing > 1 ? "s" : ""
        } missing`
      );
    }

    const value = BigInt.from(signedSafeTransaction.data.value);

    if (!value.isZero()) {
      const balance = Ethers_Module.getBalance({
        address: env.safeAddress,
        blockTag: null,
        connection: env.connection,
      }).unwrap();
      if (value.gt(BigInt.from(balance))) {
        throw new Error("Not enough Ether funds");
      }
    }

    const txOptions: SafeContracts_Ethers_TxOptions = {
      gasLimit: null,
      gasPrice: null,
      value: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      nonce: null,
    };

    if (args.options) {
      if (args.options!.gas && args.options!.gasLimit) {
        throw new Error(
          "Cannot specify gas and gasLimit together in transaction options"
        );
      }

      if (args.options!.gasPrice) {
        txOptions.gasPrice = args.options!.gasPrice;
      }

      if (args.options!.gasLimit) {
        txOptions.gasLimit = args.options!.gasLimit;
      }
    }

    const txReceipt = SafeContracts_Module.execTransaction({
      safeAddress: env.safeAddress,
      safeTransaction: toTransaction(signedSafeTransaction),
      txOptions,
      connection: {
        networkNameOrChainId: env.connection.networkNameOrChainId,
        node: env.connection.node,
      },
    }).unwrap();

    return toTxReceipt(txReceipt);
  }

  getBalance(args: Args_getBalance, env: Env): BigInt {
    return Ethers_Module.getBalance({
      address: env.safeAddress,
      connection: env.connection,
      blockTag: null,
    }).unwrap();
  }

  getChainId(args: Args_getChainId, env: Env): string {
    return Ethers_Module.getChainId({ connection: env.connection }).unwrap();
  }

  getModules(args: Args_getModules, env: Env): string[] {
    return getModules(args, env);
  }

  isOwner(args: Args_isOwner, env: Env): bool {
    return ownerManager.isOwner(args, env)
  }
  encodeEnableModuleData(args: Args_encodeEnableModuleData, env: Env): string {
    return encodeEnableModuleData(args, env);
  }

  encodeDisableModuleData(
    args: Args_encodeDisableModuleData,
    env: Env
  ): string {
    return encodeDisableModuleData(args, env);
  }

  isModuleEnabled(args: Args_isModuleEnabled, env: Env): bool {
    return isModuleEnabled(args, env);
  }

  encodeAddOwnerWithThresholdData(
    args: Args_encodeAddOwnerWithThresholdData,
    env: Env
  ): string {
    return ownerManager.encodeAddOwnerWithThresholdData(args, env);
  }

  encodeRemoveOwnerData(args: Args_encodeRemoveOwnerData, env: Env): string {
    return ownerManager.encodeRemoveOwnerData(args, env);
  }

  encodeChangeThresholdData(
    args: Args_encodeChangeThresholdData,
    env: Env
  ): string {
    return ownerManager.encodeChangeThresholdData(args, env);
  }

  encodeSwapOwnerData(args: Args_encodeSwapOwnerData, env: Env): string {
    return ownerManager.encodeSwapOwnerData(args, env);
  }

  encodeMultiSendData(args: Args_encodeMultiSendData): string {
    const multiSendData = encodeMultiSendDataInternal(args.txs);

    return EthersUtils_Module.encodeFunction({
      method: "function multiSend(bytes transactions)",
      args: [multiSendData],
    }).unwrap();
  }

  getContractVersion(args: Args_getContractVersion, env: Env): string {
    return contractManager.getContractVersion(args, env);
  }

  getNonce(args: Args_getNonce, env: Env): BigInt {
    return contractManager.getNonce(args, env);
  }

  getAddress(args: Args_getAddress, env: Env): string {
    return contractManager.getAddress(args, env);
  }

  getThreshold(args: Args_getThreshold, env: Env): u32 {
    return ownerManager.getThreshold(args, env)
  }

  getOwners(args: Args_getOwners, env: Env): string[] {
    return ownerManager.getOwners(args, env)
  }
}
