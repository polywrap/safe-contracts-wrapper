import {
  Args_createTransaction,
  Args_addSignature,
  Env,
  Ethereum_Module,
  SafeContracts_Module,
  Ethereum_TxReceipt,
  SafeContracts_Ethereum_TxOptions,
  SafeTransactionData,
  SignSignature,
  SafeTransaction,
  Ethereum_TxOptions,
  EthersUtils_Module,
} from "./wrap";
import { Args_getTransactionHash } from "./wrap/Module";
import { adjustVInSignature, arrayify, createTransactionFromPartial, encodeMultiSendData, generatePreValidatedSignature } from "./utils";
import {
  Args_approveTransactionHash,
  Args_createMultiSendTransaction,
  Args_executeTransaction,
  Args_getBalance,
  Args_getChainId,
  Args_getOwnersWhoApprovedTx,
  Args_signTransactionHash,
  Args_signTypedData,
} from "./wrap/Module/serialization";
import { BigInt, Box } from "@polywrap/wasm-as";
import { generateTypedData, toJsonTypedData } from "./utils/typedData";

import * as ownerManager from "./managers/ownerManager";
import * as contractManager from "./managers/contractManager";
import { toTransaction, toTransactionData, toTxReceipt } from "./utils/typeMap";

export * from "./managers";

export function createTransaction(args: Args_createTransaction, env: Env): SafeTransaction {
  const transactionData = createTransactionFromPartial(args.tx, args.options);

  return {
    data: transactionData,
    signatures: new Map<string, SignSignature>(),
  };
}

export function createMultiSendTransaction(args: Args_createMultiSendTransaction, env: Env): SafeTransaction {
  if (args.txs.length == 0) {
    throw new Error("Invalid empty array of transactions");
  }

  if (args.txs.length == 1) {
    return createTransaction({ tx: args.txs[0], options: args.options }, env);
  }

  const multiSendData = encodeMultiSendData(args.txs);

  const data = EthersUtils_Module.encodeFunction({
    method: "function multiSend(bytes transactions)",
    args: [multiSendData],
  }).unwrap();

  const transactionData = createTransactionFromPartial({ data: "", to: "", value: BigInt.from("") } as SafeTransactionData, null);

  let multiSendAddress: string = "";

  if (args.customMultiSendContractAddress != null) {
    multiSendAddress = args.customMultiSendContractAddress!;
  } else {
    const chainId = Ethereum_Module.getChainId({ connection: env.connection }).unwrap();
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
    baseGas: args.options != null && args.options!.baseGas ? args.options!.baseGas : transactionData.baseGas,
    gasPrice: args.options != null && args.options!.gasPrice ? args.options!.gasPrice : transactionData.gasPrice,
    gasToken: args.options != null && args.options!.gasToken ? args.options!.gasToken : transactionData.gasToken,
    nonce: args.options != null && args.options!.nonce ? args.options!.nonce : transactionData.nonce,
    refundReceiver: args.options != null && args.options!.refundReceiver ? args.options!.refundReceiver : transactionData.refundReceiver,
    safeTxGas: args.options != null && args.options!.safeTxGas ? args.options!.safeTxGas : transactionData.safeTxGas,
  };

  return {
    data: multiSendTransaction,
    signatures: new Map<string, SignSignature>(),
  };
}

export function addSignature(args: Args_addSignature, env: Env): SafeTransaction {
  const signerAddress = Ethereum_Module.getSignerAddress({
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  }).unwrap();

  const addressIsOwner = ownerManager.isOwner({ ownerAddress: signerAddress }, env);

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
  if (args.signingMethod != null && args.signingMethod! == "eth_signTypedData") {
    const signature = signTypedData({ tx: args.tx.data }, env);
    signatures.set(signerAddress, signature);
  } else {
    const transactionHash = getTransactionHash({ tx: args.tx.data }, env);
    const signature = signTransactionHash({ hash: transactionHash }, env);
    signatures.set(signerAddress, signature);
  }
  //Add signature of current signer
  args.tx.signatures = signatures;

  return args.tx;
}

export function getTransactionHash(args: Args_getTransactionHash, env: Env): string {
  return SafeContracts_Module.getTransactionHash({
    safeAddress: env.safeAddress,
    safeTransactionData: toTransactionData(args.tx),
    connection: {
      networkNameOrChainId: env.connection.networkNameOrChainId,
      node: env.connection.node,
    },
  }).unwrap();
}

export function signTransactionHash(args: Args_signTransactionHash, env: Env): SignSignature {
  const signer = Ethereum_Module.getSignerAddress({
    connection: env.connection,
  }).unwrap();

  const byteArray = arrayify(args.hash).buffer;

  // TODO polywrap ethereum-plugin implementation required
  const signature = Ethereum_Module.signMessageBytes({
    bytes: byteArray,
    connection: {
      node: env.connection.node,
      networkNameOrChainId: env.connection.networkNameOrChainId,
    },
  }).unwrap();

  const adjustedSignature = adjustVInSignature("eth_sign", signature, args.hash, signer);

  return { signer: signer, data: adjustedSignature };
}

export function approveTransactionHash(args: Args_approveTransactionHash, env: Env): Ethereum_TxReceipt {
  const signerAddress = Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap();

  const addressIsOwner = ownerManager.isOwner({ ownerAddress: signerAddress }, env);

  if (!addressIsOwner) {
    throw new Error("Transaction hashes can only be approved by Safe owners");
  }

  const options: Ethereum_TxOptions = {
    gasPrice: null,
    nonce: null,
    value: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasLimit: null,
  }

  if (args.options) {
    if (args.options!.gasPrice) {
      options.gasPrice = args.options!.gasPrice;
    }

    if (args.options!.gasLimit) {
      options.gasLimit = args.options!.gasLimit;
    }
  }

  if (!options.gasLimit) {
    options.gasLimit = Ethereum_Module.estimateContractCallGas({
      method: "function approveHash(bytes32 hashToApprove)",
      address: env.safeAddress,
      args: [args.hash],
      connection: env.connection,
      options: null,
    }).unwrap();
  }

  const response = Ethereum_Module.callContractMethodAndWait({
    method: "function approveHash(bytes32 hashToApprove)",
    address: env.safeAddress,
    args: [args.hash],
    connection: env.connection,
    options,
  }).unwrap();

  return response;
}

export function getOwnersWhoApprovedTx(args: Args_getOwnersWhoApprovedTx, env: Env): string[] {
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

export function signTypedData(args: Args_signTypedData, env: Env): SignSignature {
  const recreatedTx = createTransactionFromPartial(args.tx, null);

  const safeVersion = contractManager.getContractVersion({}, env);

  const chainId = Ethereum_Module.getChainId({ connection: env.connection }).unwrap();

  const typedData = generateTypedData(env.safeAddress, safeVersion, chainId, recreatedTx);
  const jsonTypedData = toJsonTypedData(typedData);

  const signature = Ethereum_Module.signTypedData({ payload: jsonTypedData, connection: env.connection }).unwrap();

  return {
    signer: Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap(),
    data: adjustVInSignature("eth_signTypedData", signature, null, null),
  };
}

export function executeTransaction(args: Args_executeTransaction, env: Env): Ethereum_TxReceipt {
  const transaction = args.tx;

  const signedSafeTransaction = createTransaction({ tx: args.tx.data, options: null }, env);

  for (let i = 0; i < transaction.signatures!.keys().length; i++) {
    const key = transaction.signatures!.keys()[i];

    const signature = transaction.signatures!.get(key);

    signedSafeTransaction.signatures!.set(signature.signer.toLowerCase(), signature);
  }

  const txHash = getTransactionHash({ tx: signedSafeTransaction.data }, env);

  const ownersWhoApprovedTx = getOwnersWhoApprovedTx({ hash: txHash }, env);
  for (let i = 0; i < ownersWhoApprovedTx.length; i++) {
    const owner = ownersWhoApprovedTx[i];
    signedSafeTransaction.signatures!.set(owner.toLowerCase(), generatePreValidatedSignature(owner));
  }

  const owners = ownerManager.getOwners({}, env);

  const signerAddress = Ethereum_Module.getSignerAddress({ connection: env.connection }).unwrap();

  if (owners.includes(signerAddress)) {
    signedSafeTransaction.signatures!.set(signerAddress.toLowerCase(), generatePreValidatedSignature(signerAddress));
  }

  const threshold = ownerManager.getThreshold({}, env);

  if (threshold > <u32>signedSafeTransaction.signatures!.size) {
    const signaturesMissing = threshold - signedSafeTransaction.signatures!.size;
    throw new Error(`There ${signaturesMissing > 1 ? "are" : "is"} ${signaturesMissing} signature${signaturesMissing > 1 ? "s" : ""} missing`);
  }

  const value = BigInt.from(signedSafeTransaction.data.value);

  if (!value.isZero()) {
    const balance = Ethereum_Module.getBalance({
      address: env.safeAddress,
      blockTag: null,
      connection: env.connection,
    }).unwrap();
    if (value.gt(BigInt.from(balance))) {
      throw new Error("Not enough Ether funds");
    }
  }

  const txOptions: SafeContracts_Ethereum_TxOptions = {
    gasLimit: null,
    gasPrice: null,
    value: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    nonce: null
  };

  if (args.options) {
    if (args.options!.gas && args.options!.gasLimit) {
      throw new Error("Cannot specify gas and gasLimit together in transaction options");
    }

    if (args.options!.gasPrice) {
      txOptions.gasPrice = args.options!.gasPrice;
    }

    if (args.options!.gasLimit){
      txOptions.gasLimit = args.options!.gasLimit;
    }
  }

  const txReceipt = SafeContracts_Module.execTransaction({
    safeAddress: env.safeAddress,
    safeTransaction: toTransaction(signedSafeTransaction),
    txOptions,
    connection: { networkNameOrChainId: env.connection.networkNameOrChainId, node: env.connection.node },
  }).unwrap();

  return toTxReceipt(txReceipt);
}

export function getBalance(args: Args_getBalance, env: Env): BigInt {
  return Ethereum_Module.getBalance({ address: env.safeAddress, connection: env.connection, blockTag: null }).unwrap();
}

export function getChainId(args: Args_getChainId, env: Env): String {
  return Ethereum_Module.getChainId({ connection: env.connection }).unwrap();
}
