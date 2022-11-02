import { BigInt } from "@polywrap/wasm-as";
import { SafeTransactionData } from "../wrap";
import { ZERO_ADDRESS } from "./constants";

export function getTransactionHashArgs(tx: SafeTransactionData): string[] {
  return [
    tx.to,
    tx.value,
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

export const createTransactionFromPartial = (
  transactionData: SafeTransactionData
): SafeTransactionData => {
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
  }

  if (transactionData.gasPrice) {
    transaction.gasPrice = transactionData.gasPrice!;
  }

  if (transactionData.safeTxGas) {
    transaction.safeTxGas = transactionData.safeTxGas!;
  }

  if (transactionData.gasToken != null) {
    transaction.gasToken = transactionData.gasToken!;
  }

  if (transactionData.nonce) {
    transaction.nonce = transactionData.nonce!;
  }

  if (transactionData.operation) {
    transaction.operation = transactionData.operation!; // 0 is Call, 1 is DelegateCall
  }

  if (transactionData.refundReceiver != null) {
    transaction.refundReceiver = transactionData.refundReceiver!;
  }

  return transaction;
};
