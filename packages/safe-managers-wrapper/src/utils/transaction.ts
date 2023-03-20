import { BigInt } from "@polywrap/wasm-as";
import { EthersUtils_Module, SafeTransactionData, SafeTransactionOptionalProps } from "../wrap";
import { ZERO_ADDRESS } from "./constants";

export function getTransactionHashArgs(tx: SafeTransactionData): string[] {
  return [
    tx.to,
    tx.value.toString(),
    tx.data,
    tx.operation!.toString(),
    tx.safeTxGas!.toString(),
    tx.baseGas!.toString(),
    tx.gasPrice!.toString(),
    tx.gasToken!,
    tx.refundReceiver!,
    tx.nonce!.toString(),
  ];
}

export function createTransactionFromPartial(
  transactionData: SafeTransactionData,
  options: SafeTransactionOptionalProps | null
): SafeTransactionData {
  let transaction: SafeTransactionData = {
    data: transactionData.data,
    to: transactionData.to,
    value: transactionData.value,
    baseGas: BigInt.from("0"),
    gasPrice: BigInt.from("0"),
    safeTxGas: BigInt.from("0"),
    gasToken: ZERO_ADDRESS,
    nonce: BigInt.from("0"),
    operation: BigInt.from("0"),
    refundReceiver: ZERO_ADDRESS,
  };

  // TODO: if args.tx.data is parsed as an array, create multisend tx
  // let value: Box<u32> = args.tx.value != null ? args.tx.value : <u32>0;

  // Box skips '!= null' check, and 'Box.isEmpty()' can't be used if value type is Box | null

  if (transactionData.baseGas) {
    transaction.baseGas = transactionData.baseGas!;
  } else if (options != null && options.baseGas) {
    transaction.baseGas = options.baseGas;
  }

  if (transactionData.gasPrice) {
    transaction.gasPrice = transactionData.gasPrice!;
  } else if (options != null && options.gasPrice) {
    transaction.gasPrice = options.gasPrice;
  }

  if (transactionData.safeTxGas) {
    transaction.safeTxGas = transactionData.safeTxGas!;
  } else if (options != null && options.safeTxGas) {
    transaction.safeTxGas = options.safeTxGas;
  }

  if (transactionData.gasToken != null) {
    transaction.gasToken = transactionData.gasToken!;
  } else if (options != null && options.gasToken) {
    transaction.gasToken = options.gasToken;
  }

  if (transactionData.nonce) {
    transaction.nonce = transactionData.nonce!;
  } else if (options != null && options.nonce) {
    transaction.nonce = options.nonce;
  }

  if (transactionData.operation) {
    transaction.operation = transactionData.operation!; // 0 is Call, 1 is DelegateCall
  } else if (options != null && options.operation) {
    transaction.operation = options.operation;
  }

  if (transactionData.refundReceiver != null) {
    transaction.refundReceiver = transactionData.refundReceiver!;
  } else if (options != null && options.refundReceiver != null) {
    transaction.refundReceiver = options.refundReceiver;
  }

  return transaction;
}

export const encodeMultiSendData = (transactionDataArr: SafeTransactionData[]): string => {
  let dataStr = "";

  for (let i = 0; i < transactionDataArr.length; i++) {
    const standardized = createTransactionFromPartial(transactionDataArr[i], null);
    const encodedData  = EthersUtils_Module.encodeMetaTransaction({
      to: standardized.to,
      value: standardized.value,
      data: standardized.data,
      operation: standardized.operation || BigInt.from("0"),
    }).unwrap();
    dataStr = dataStr.concat(encodedData.slice(2));
  }
  return "0x" + dataStr;
};

