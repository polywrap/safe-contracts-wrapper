import { SafeTransactionData, SafeTransactionDataPartial } from "../wrap";
import { ZERO_ADDRESS } from "./constants";

export function getTransactionHashArgs(
  tx: SafeTransactionData,
  nonce: u32
): string[] {
  /*   let safeTxGas = BigInt.from("0");
  let baseGas = BigInt.from("0");
  let gasPrice = BigInt.from("0");
  let gasToken = ZERO_ADDRESS;
  let refundReceiver = ZERO_ADDRESS;

  let operation = 0;
  if (tx.operation != null) {
    operation = tx.operation!.unwrap();
  }

  //TODO check if bigints and != 0
  if (tx.safeTxGas != null) {
    safeTxGas = tx.safeTxGas!;
  }
  if (tx.baseGas) {
    baseGas = tx.baseGas!;
  }
  if (tx.gasPrice) {
    gasPrice = tx.gasPrice!;
  }
  if (tx.gasToken != null) {
    gasToken = tx.gasToken!;
  }
  if (tx.refundReceiver != null) {
    refundReceiver = tx.refundReceiver!;
  } */

  return [
    tx.to,
    tx.value,
    tx.data,
    tx.operation.toString(),
    tx.safeTxGas.toString(),
    tx.baseGas.toString(),
    tx.gasPrice.toString(),
    tx.gasToken,
    tx.refundReceiver,
    nonce.toString(),
  ];
}

export const createTransactionFromPartial = (
  transactionData: SafeTransactionDataPartial
): SafeTransactionData => {
  const transaction: SafeTransactionData = {
    data: transactionData.data,
    to: transactionData.to,
    value: transactionData.value,
    baseGas: 0,
    gasPrice: 0,
    safeTxGas: 0,
    gasToken: ZERO_ADDRESS,
    nonce: null,
    operation: 0,
    refundReceiver: ZERO_ADDRESS,
  };
  // TODO: if args.tx.data is parsed as an array, create multisend tx
  // let value: Box<u32> = args.tx.value != null ? args.tx.value : <u32>0;

  if (transactionData.baseGas != null) {
    transaction.baseGas = transactionData.baseGas.unwrap();
  }

  if (transactionData.gasPrice != null) {
    transaction.gasPrice = transactionData.gasPrice.unwrap();
  }

  if (transactionData.safeTxGas != null) {
    transaction.safeTxGas = transactionData.safeTxGas.unwrap();
  }

  if (transactionData.gasToken != null) {
    transaction.gasToken = transactionData.gasToken;
  }

  if (transactionData.operation != null) {
    transaction.operation = transactionData.operation.unwrap(); // 0 is Call, 1 is DelegateCall
  }

  if (transactionData.refundReceiver != null) {
    transaction.refundReceiver = transactionData.refundReceiver;
  }

  return transaction;
};
