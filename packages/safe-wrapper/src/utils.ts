import { BigInt } from "@polywrap/wasm-as";
import { SafeTransaction, Ethereum_Module } from "./wrap";

export const ZERO_ADDRESS = `0x${"0".repeat(40)}`;

export function isHexString(value: string): boolean {
  if (typeof value != "string" || value.startsWith("0x")) {
    return false;
  }
  return true;
}

export function getTransactionHashArgs(
  tx: SafeTransaction,
  nonce: BigInt
): string[] {
  let safeTxGas = BigInt.from("0");
  let baseGas = BigInt.from("0");
  let gasPrice = BigInt.from("0");
  let gasToken = ZERO_ADDRESS;
  let refundReceiver = ZERO_ADDRESS;

  let operation = 0;
  if (tx.operation != null) {
    operation = tx.operation!.unwrap();
  }

  //TODO check if bigints and != 0
  if (tx.safeTxGas) {
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
  }

  return [
    tx.to,
    tx.value,
    tx.data,
    operation.toString(),
    safeTxGas.toString(),
    baseGas.toString(),
    gasPrice.toString(),
    gasToken,
    refundReceiver,
    nonce.toString(),
  ];
}

export function arrayify(value: string): Uint8Array {
  /*   let hex = (value).substring(2);

  const result = new Array<i32>();;
  for (let i = 0; i < hex.length; i += 2) {
    result.push(<i32>parseInt(hex.substring(i, i + 2), 16));
  }
  
  return result // Uint8Array.wrap(ArrayBuffer.from(result));
  
   */
  const buffer = toUtf8Bytes(value);
  return Uint8Array.wrap(buffer);
}

export function toUtf8Bytes(value: string): ArrayBuffer {
  return String.UTF8.encode(value);
}
