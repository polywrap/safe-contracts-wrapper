import {
  Ethereum_Log,
  Ethereum_TxReceipt,
  Interface_SafeTransaction,
  Interface_SafeTransactionData,
  Interface_SignSignature,
  SafeContracts_Ethereum_TxReceipt,
  SafeContracts_Interface_SafeTransaction,
  SafeContracts_Interface_SafeTransactionData,
  SafeContracts_Interface_SignSignature,
} from "../wrap";

export function toTransaction(tx: Interface_SafeTransaction): SafeContracts_Interface_SafeTransaction {
  return {
    data: toTransactionData(tx.data),
    signatures: toTransactionSignatures(tx.signatures!),
  };
}

export function toTransactionData(txData: Interface_SafeTransactionData): SafeContracts_Interface_SafeTransactionData {
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

export function toTransactionSignatures(signatures: Map<string, Interface_SignSignature>): Map<string, SafeContracts_Interface_SignSignature> {
  const newMap = new Map<string, SafeContracts_Interface_SignSignature>();

  const keys = signatures.keys();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = signatures.get(key);
    newMap.set(key, { data: value.data, signer: value.signer });
  }

  return newMap;
}

export function toTxReceipt(txReceipt: SafeContracts_Ethereum_TxReceipt): Ethereum_TxReceipt {
  return {
    _from: txReceipt._from,
    _type: txReceipt._type,
    blockHash: txReceipt.blockHash,
    blockNumber: txReceipt.blockNumber,
    byzantium: txReceipt.byzantium,
    confirmations: txReceipt.confirmations,
    contractAddress: txReceipt.contractAddress,
    cumulativeGasUsed: txReceipt.cumulativeGasUsed,
    effectiveGasPrice: txReceipt.effectiveGasPrice,
    gasUsed: txReceipt.gasUsed,
    logs: txReceipt.logs.map<Ethereum_Log>((l) => ({
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
