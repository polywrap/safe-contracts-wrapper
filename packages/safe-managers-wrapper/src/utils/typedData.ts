import { JSON, JSONEncoder } from "@polywrap/wasm-as";
import { SafeTransactionData } from "../wrap";

export const EIP712_DOMAIN_BEFORE_V130: TypedDataField[] = [
  {
    type: "address",
    name: "verifyingContract",
  },
];

export const EIP712_DOMAIN: TypedDataField[] = [
  {
    type: "uint256",
    name: "chainId",
  },
  {
    type: "address",
    name: "verifyingContract",
  },
];

class TypedDataField {
  type: string;
  name: string;
}
class TypedTypes {
  EIP712Domain: TypedDataField[];
  SafeTx: TypedDataField[];
}
class Domain {
  chainId: u64;
  verifyingContract: string;
}
class TypedData {
  types: TypedTypes;
  primaryType: string;
  domain: Domain;
  message: SafeTransactionData;
}

function EQ_OR_GT_1_3_0(version: u64): bool {
  return version >= 130;
}

export function generateTypedData(
  safeAddress: string,
  safeVersion: string,
  chainId: string,
  safeTransactionData: SafeTransactionData
): TypedData {
  const safeNumberVersion = U64.parseInt(safeVersion.replaceAll(".", ""));

  const eip712WithChainId = EQ_OR_GT_1_3_0(safeNumberVersion);
  const typedData: TypedData = {
    types: {
      EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
      SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
      ],
    },
    domain: {
      verifyingContract: safeAddress,
      chainId: 0,
    },
    primaryType: "SafeTx",
    message: safeTransactionData,
  };
  if (eip712WithChainId) {
    typedData.domain.chainId = u32(parseInt(chainId));
  }
  return typedData;
}

export function toJsonTypedData(typedData: TypedData): JSON.Value {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);

  //Encode domain
  encoder.pushObject("domain");
  if (typedData.domain.chainId > 0) {
    encoder.setInteger("chainId", typedData.domain.chainId);
  }
  encoder.setString("verifyingContract", typedData.domain.verifyingContract);
  encoder.popObject();

  //Encode types-----------------------
  encoder.pushObject("types");

  encoder.pushArray("EIP712Domain");
  for (let i = 0; i < typedData.types.EIP712Domain.length; i++) {
    const field = typedData.types.EIP712Domain[i];
    encoder.pushObject(null);
    encoder.setString("name", field.name);
    encoder.setString("type", field.type);
    encoder.popObject();
  }
  encoder.popArray();

  encoder.pushArray("SafeTx");
  for (let i = 0; i < typedData.types.SafeTx.length; i++) {
    const field = typedData.types.SafeTx[i];
    encoder.pushObject(null);
    encoder.setString("name", field.name);
    encoder.setString("type", field.type);
    encoder.popObject();
  }
  encoder.popArray();

  encoder.popObject();
  //-------------------

  encoder.setString("primaryType", typedData.primaryType);

  //Encode message
  const message = typedData.message;

  encoder.pushObject("message");
  encoder.setString("to", message.to);
  encoder.setString("data", message.data);
  encoder.setString("value", message.value.toString());
  encoder.setString("baseGas", message.baseGas!.toString());
  encoder.setInteger("gasPrice", message.gasPrice!.toUInt64());
  encoder.setString("gasToken", message.gasToken!);
  encoder.setInteger("nonce", message.nonce!.toUInt64());
  encoder.setInteger("operation", message.operation!.toUInt64());
  encoder.setInteger("safeTxGas", message.safeTxGas!.toUInt64());
  encoder.setString("refundReceiver", message.refundReceiver!);
  encoder.popObject();
  //--------------------

  encoder.popObject();

  return <JSON.Value>JSON.parse(encoder.serialize());
}
