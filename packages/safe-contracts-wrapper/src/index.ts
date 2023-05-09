import {
  Ethers_Module,
  Ethers_Log,
  EthersUtils_Module,
  Args_createProxy,
  Args_proxyCreationCode,
  Args_estimateGas,
  Args_encode,
  Args_getOwners,
  Args_getThreshold,
  Args_isOwner,
  Args_getModules,
  Args_isModuleEnabled,
  Ethers_TxReceipt,
  Ethers_TxOptions,
  Args_encodeExecTransaction,
  ModuleBase
} from "./wrap";
import { BigInt, Box } from "@polywrap/wasm-as";
import { JSON } from "assemblyscript-json";
import {
  Args_approvedHashes,
  Args_approveHash,
  Args_execTransaction,
  Args_getAddress,
  Args_getNonce,
  Args_getSafeContractNetworks,
  Args_getTransactionHash,
  Args_getVersion,
} from "./wrap/Module/serialization";
import { ContractNetworksConfig } from "./wrap/ContractNetworksConfig";
import {
  createTransactionFromPartial,
  encodeSignatures,
  getFallbackHandlerCompability,
  getMultiSendCallOnlyContractAddress,
  getMultiSendContractAddress,
  getSafeContractAddress,
  getSafeFactoryContractAddress,
  getTransactionHashArgs,
} from "./utils";

export class Module extends ModuleBase {
  encode(args: Args_encode): string {
    return EthersUtils_Module.encodeFunction({
      method: args.method,
      args: args.args,
    }).unwrap();
  }
  
  estimateGas(args: Args_estimateGas): BigInt {
    return Ethers_Module.estimateContractCallGas({
      address: args.address,
      method: args.method,
      args: args.args,
      connection: args.connection,
      options: null,
    }).unwrap();
  }
  
  proxyCreationCode(args: Args_proxyCreationCode): string {
    return Ethers_Module.callContractView({
      address: args.address,
      method: "function proxyCreationCode() public pure returns (bytes memory)",
      args: [],
      connection: args.connection,
    }).unwrap();
  }
  
  createProxy(args: Args_createProxy): string {
    let txOptions: Ethers_TxOptions | null = null;
  
    if (args.txOptions != null) {
      txOptions = {
        value: null,
        gasLimit: null,
        gasPrice: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        nonce: null,
      };
  
      if (args.txOptions!.value) {
        txOptions.value = args.txOptions!.value;
      }
      if (!args.txOptions!.gasPrice) {
        txOptions.gasPrice = Ethers_Module.getGasPrice({
          connection: args.connection,
        }).unwrap();
      }
  
      if (!args.txOptions!.gasLimit) {
        txOptions.gasLimit = Ethers_Module.estimateContractCallGas({
          address: args.address,
          method: "function createProxyWithNonce(address,bytes memory,uint256)",
          args: [
            args.safeMasterCopyAddress,
            args.initializer,
            args.saltNonce.toString(),
          ],
          connection: args.connection,
          options: txOptions,
        }).unwrap();
      }
    }
  
    const tx = Ethers_Module.callContractMethodAndWait({
      address: args.address,
      method: "function createProxyWithNonce(address,bytes memory,uint256)",
      args: [
        args.safeMasterCopyAddress,
        args.initializer,
        args.saltNonce.toString(),
      ],
      connection: args.connection,
      options: txOptions,
    }).unwrap();
  
    // ProxyCreation(address)
    const proxyCreation_1_2_0 =
      "0xa38789425dbeee0239e16ff2d2567e31720127fbc6430758c1a4efc6aef29f80";
    // ProxyCreation(address,address)
    const proxyCreation_1_3_0 =
      "0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235";
    const index = tx.logs.findIndex(
      (log: Ethers_Log) =>
        log.topics[0] == proxyCreation_1_2_0 ||
        log.topics[0] == proxyCreation_1_3_0
    );
  
    if (index == -1) {
      throw new Error(
        "Couldn't fetch address from event logs from transaction " +
          tx.transactionHash
      );
    }
  
    const address = "0x" + tx.logs[index].data.slice(32, 72);
  
    return address;
  }
  
  /*--------------
    GnosisSafeContractEthers methods
  --------------*/
  
  getVersion(args: Args_getVersion): string {
    const version = Ethers_Module.callContractView({
      address: args.address,
      method: "function VERSION() public view returns (string)",
      args: [],
      connection: args.connection,
    }).unwrap();
  
    return version;
  }
  
  getAddress(args: Args_getAddress): string {
    return args.address;
  }
  
  getNonce(args: Args_getNonce): BigInt {
    const nonce = Ethers_Module.callContractView({
      address: args.address,
      method: "function nonce() public view returns (uint256)",
      args: [],
      connection: args.connection,
    }).unwrap();
  
    return BigInt.from(nonce);
  }
  
  getThreshold(args: Args_getThreshold): u32 {
    const resp = Ethers_Module.callContractView({
      address: args.address,
      method: "function getThreshold() public view returns (uint256)",
      args: null,
      connection: args.connection,
    }).unwrap();
    return u32(parseInt(resp, 10));
  }
  
  getOwners(args: Args_getOwners): string[] {
    const resp = Ethers_Module.callContractView({
      address: args.address,
      method: "function getOwners() public view returns (address[] memory)",
      args: null,
      connection: args.connection,
    }).unwrap();
  
    const v = JSON.parse(resp);
    if (!v.isArr) {
      throw new Error("ethereum value is not array: " + v.stringify());
    }
    const arr = (v as JSON.Arr).valueOf();
    const result: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      let s = arr[i];
      if (!s.isString) {
        throw new Error("ethereum value element is not string: " + s.stringify());
      }
      result.push((s as JSON.Str).valueOf());
    }
    return result;
  }
  
  isOwner(args: Args_isOwner): bool {
    const resp = Ethers_Module.callContractView({
      address: args.address,
      method: "function isOwner(address owner) public view returns (bool)",
      args: [args.ownerAddress],
      connection: args.connection,
    }).unwrap();
    if (resp == "true") {
      return true;
    } else {
      return false;
    }
  }
  
  getTransactionHash(args: Args_getTransactionHash): string {
    const recreatedTx = createTransactionFromPartial(
      args.safeTransactionData,
      null
    );
  
    const contractArgs = getTransactionHashArgs(recreatedTx);
  
    const res = Ethers_Module.callContractView({
      address: args.safeAddress,
      method:
        "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
      args: contractArgs,
      connection: args.connection,
    }).unwrap();
  
    return res;
  }
  
  approvedHashes(args: Args_approvedHashes): BigInt {
    const result = Ethers_Module.callContractView({
      address: args.address,
      method:
        "function approvedHashes(address owner, bytes32 hash) public view returns (uint256)",
      args: [args.ownerAddress, args.hash],
      connection: args.connection,
    }).unwrap();
    return BigInt.from(result);
  }
  
  approveHash(args: Args_approveHash): Ethers_TxReceipt {
    const signerAddress = Ethers_Module.getSignerAddress({
      connection: args.connection,
    }).unwrap();
  
    const addressIsOwner = this.isOwner({
      address: args.safeAddress,
      ownerAddress: signerAddress,
      connection: args.connection,
    });
  
    if (!addressIsOwner) {
      throw new Error("Transaction hashes can only be approved by Safe owners");
    }
  
    if (
      args.options != null &&
      args.options!.gasPrice &&
      args.options!.gasLimit
    ) {
      throw new Error(
        "Cannot specify gas and gasLimit together in transaction options"
      );
    }
  
    if (args.options != null && !args.options!.gasLimit) {
      args.options!.gasLimit = this.estimateGas({
        address: args.safeAddress,
        method: "function approveHash(bytes32 hashToApprove) external",
        args: [args.hash],
        connection: args.connection,
      });
    }
  
    const nonce = args.options ? args.options!.nonce : null;
  
    const response = Ethers_Module.callContractMethodAndWait({
      method: "function approveHash(bytes32 hashToApprove) external",
      address: args.safeAddress,
      args: [args.hash],
      connection: args.connection,
      options: {
        gasLimit: args.options ? args.options!.gasLimit : null,
        gasPrice: args.options ? args.options!.gasPrice : null,
        value: null,
        maxFeePerGas: args.options ? args.options!.maxFeePerGas : null,
        maxPriorityFeePerGas: args.options
          ? BigInt.from(args.options!.maxPriorityFeePerGas)
          : null,
        nonce: nonce ? Box.from(nonce.toUInt32()) : null,
      },
    }).unwrap();
  
    return response;
  }
  
  getModules(args: Args_getModules): string[] {
    const resp = Ethers_Module.callContractView({
      address: args.address,
      method:
        "function getModulesPaginated(address,uint256) external view returns (address[] memory,address)",
      args: ["0x0000000000000000000000000000000000000001", "15"],
      connection: args.connection,
    }).unwrap();
    // TODO; rewrite to json
    const comma = resp.lastIndexOf(",");
    const arr = resp.substring(0, comma);
    if (arr.includes(",")) {
      return arr.split(",");
    } else {
      return [];
    }
  }
  
  isModuleEnabled(args: Args_isModuleEnabled): bool {
    const resp = Ethers_Module.callContractView({
      address: args.address,
      method:
        "function isModuleEnabled(address module) public view returns (bool)",
      args: [args.moduleAddress],
      connection: args.connection,
    }).unwrap();
    if (resp === "true") {
      return true;
    } else {
      return false;
    }
  }
  
  execTransaction(
    args: Args_execTransaction
  ): Ethers_TxReceipt {
    const txData = args.safeTransaction.data;
    const txSignatures = args.safeTransaction.signatures!;
  
    const txOptions: Ethers_TxOptions = {
      gasLimit: args.txOptions != null ? args.txOptions!.gasLimit : null,
      gasPrice: args.txOptions != null ? args.txOptions!.gasPrice : null,
      value: args.txOptions != null ? args.txOptions!.value : null,
      maxFeePerGas: args.txOptions ? args.txOptions!.maxFeePerGas : null,
      maxPriorityFeePerGas: args.txOptions
        ? args.txOptions!.maxPriorityFeePerGas
        : null,
      nonce: args.txOptions ? args.txOptions!.nonce : null,
    };
  
    const method =
      "function execTransaction(address,uint256,bytes calldata,uint8,uint256,uint256,uint256,address,address,bytes memory)";
  
    const encodedSignatures = encodeSignatures(txSignatures);
    if (!txOptions.gasLimit) {
      const estimationArgs = getTransactionHashArgs(txData);
      estimationArgs.pop();
      estimationArgs.push(encodedSignatures);
  
      txOptions.gasLimit = this.estimateGas({
        address: args.safeAddress,
        method,
        args: estimationArgs,
        connection: args.connection,
      });
    }
  
    return Ethers_Module.callContractMethodAndWait({
      address: args.safeAddress,
      method,
      args: [
        txData.to,
        txData.value.toString(),
        txData.data,
        txData.operation!.toString(),
        txData.safeTxGas!.toString(),
        txData.baseGas!.toString(),
        txData.gasPrice!.toString(),
        txData.gasToken!,
        txData.refundReceiver!,
        encodedSignatures,
      ],
      options: txOptions,
      connection: args.connection,
    }).unwrap();
  }
  
  getSafeContractNetworks(
    args: Args_getSafeContractNetworks
  ): ContractNetworksConfig {
    const safeContractVersion = args.version;
    const chainId = args.chainId;
    const isL1Safe: bool =
      args.isL1Safe != null ? args.isL1Safe!.unwrap() : false;
  
    if (args.filter == null) {
      return {
        multiSendAddress: getMultiSendContractAddress(
          safeContractVersion,
          chainId.toString()
        ),
        multiSendCallOnlyAddress: getMultiSendCallOnlyContractAddress(
          safeContractVersion,
          chainId.toString()
        ),
        safeMasterCopyAddress: getSafeContractAddress(
          safeContractVersion,
          chainId.toString(),
          !isL1Safe
        ),
        safeProxyFactoryAddress: getSafeFactoryContractAddress(
          safeContractVersion,
          chainId.toString()
        ),
        fallbackHandlerAddress: getFallbackHandlerCompability(
          safeContractVersion,
          chainId.toString()
        ),
      };
    } else {
      let safeContractNetworks: ContractNetworksConfig = {
        multiSendAddress: null,
        multiSendCallOnlyAddress: null,
        safeMasterCopyAddress: null,
        safeProxyFactoryAddress: null,
        fallbackHandlerAddress: null,
      };
  
      if (args.filter!.multiSendAddress) {
        safeContractNetworks.multiSendAddress = getMultiSendContractAddress(
          safeContractVersion,
          chainId.toString()
        );
      }
      if (args.filter!.multiSendCallOnlyAddress) {
        safeContractNetworks.multiSendCallOnlyAddress =
          getMultiSendCallOnlyContractAddress(
            safeContractVersion,
            chainId.toString()
          );
      }
      if (args.filter!.safeMasterCopyAddress) {
        safeContractNetworks.safeMasterCopyAddress = getSafeContractAddress(
          safeContractVersion,
          chainId.toString(),
          !isL1Safe
        );
      }
      if (args.filter!.safeProxyFactoryAddress) {
        safeContractNetworks.safeProxyFactoryAddress =
          getSafeFactoryContractAddress(safeContractVersion, chainId.toString());
      }
      if (args.filter!.fallbackHandlerAddress) {
        safeContractNetworks.fallbackHandlerAddress =
          getFallbackHandlerCompability(safeContractVersion, chainId.toString());
      }
      return safeContractNetworks;
    }
  }
  
  encodeExecTransaction(
    args: Args_encodeExecTransaction
  ): string {
    const txData = args.safeTransaction.data;
    const txSignatures = args.safeTransaction.signatures!;
    const method = "function execTransaction(address,uint256,bytes calldata,uint8,uint256,uint256,uint256,address,address,bytes memory)";
    const encodedSignatures = encodeSignatures(txSignatures);
    return EthersUtils_Module.encodeFunction({
      method,
      args: [
        txData.to,
        txData.value.toString(),
        txData.data,
        txData.operation!.toString(),
        txData.safeTxGas!.toString(),
        txData.baseGas!.toString(),
        txData.gasPrice!.toString(),
        txData.gasToken!,
        txData.refundReceiver!,
        encodedSignatures,
      ]
    }).unwrap();
  } 
}