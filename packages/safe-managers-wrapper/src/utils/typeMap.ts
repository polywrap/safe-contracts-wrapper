import {
  Ethers_Log,
  Ethers_TxReceipt,
  SafeContracts_SafeTransaction,
  SafeContracts_SafeTransactionData,
  SafeContracts_SignSignature,
  SafeContracts_Ethers_TxReceipt,
  SafeTransaction,
  SafeTransactionData,
  SignSignature,
} from "../wrap";

export function toTransaction(tx: SafeTransaction): SafeContracts_SafeTransaction {
  return {
    data: toTransactionData(tx.data),
    signatures: toTransactionSignatures(tx.signatures!),
  };
}

export function toTransactionData(txData: SafeTransactionData): SafeContracts_SafeTransactionData {
  return {
    data: txData.data,
    baseGas: txData.baseGas,
    gasPrice: txData.gasPrice,
    gasToken: txData.gasToken,
    nonce: txData.nonce,
    operation: txData.operation,
    refundReceiver: txData.refundReceiver,
    safeTxGas: txData.safeTxGas,
    to: txData.to,
    value: txData.value,
  };
}

export function toTransactionSignatures(signatures: Map<string, SignSignature>): Map<string, SafeContracts_SignSignature> {
  const newMap = new Map<string, SafeContracts_SignSignature>();

  const keys = signatures.keys();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = signatures.get(key);
    newMap.set(key, { data: value.data, signer: value.signer });
  }

  return newMap;
}

export function toTxReceipt(txReceipt: SafeContracts_Ethers_TxReceipt): Ethers_TxReceipt {
  return {
    _from: txReceipt._from,
    _type: txReceipt._type,
    blockHash: txReceipt.blockHash,
    blockNumber: txReceipt.blockNumber,
    confirmations: txReceipt.confirmations,
    contractAddress: txReceipt.contractAddress,
    cumulativeGasUsed: txReceipt.cumulativeGasUsed,
    effectiveGasPrice: txReceipt.effectiveGasPrice,
    gasUsed: txReceipt.gasUsed,
    logs: txReceipt.logs.map<Ethers_Log>((l) => ({
      address: l.address,
      blockHash: l.blockHash,
      blockNumber: l.blockNumber,
      data: l.data,
      logIndex: l.logIndex,
      removed: l.removed,
      topics: l.topics,
      transactionHash: l.transactionHash,
      transactionIndex: l.transactionIndex,
    })),
    logsBloom: txReceipt.logsBloom,
    root: txReceipt.root,
    status: txReceipt.status,
    to: txReceipt.to,
    transactionHash: txReceipt.transactionHash,
    transactionIndex: txReceipt.transactionIndex,
  };
}
