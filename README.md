# Polywrap Gnosis Safe Wrapper

## Table of contents
* [Installation](#installation)
* [Getting Started](#getting-started)
* [Safe Factory Wrapper Reference](#safe-factory-wrapper)
* [Safe Manager Wrapper Reference](#safe-managers-wrapper)
## <a name="installation">Installation</a>

Install the package with yarn or npm:

```bash
yarn add polywrap
npm install polywrap
```

## <a name="getting-started">Getting Started</a>

The following steps show how to set up the Polywrap Client, deploy a new Safe, create a Safe transaction, generate the required signatures from owners and execute the transaction.

### Note
Currently, the wrappers dont allow the collection of owner signatures off-chain. To do this and be able to see and confirm the pending transactions shown in the [Safe Web App](https://gnosis-safe.io/app/), it is recommended that you follow this other [guide](https://github.com/safe-global/safe-core-sdk/blob/main/guides/integrating-the-safe-core-sdk.md#5-propose-the-transaction-to-the-service) that covers the use of the Safe Core SDK, combined with the Safe Service Client.

### 1. Instantiate a Polywrap Client

First of all, we need to create a `Polywrap Client`, which contains all the required utilities for the SDKs to interact with the blockchain. It acts as a wrapper for [web3.js](https://web3js.readthedocs.io/) or [ethers.js](https://docs.ethers.io/v5/) Ethereum libraries.

Use an import or require statement, depending on which your environment supports.

```js
import { PolywrapClient } from "@polywrap/client-js";
```

Then, you will be able to use the PolywrapClient like so:
```js
// Simply instantiate the PolywrapClient.
const client = new PolywrapClient();
```
[Polywrap client docs](https://docs.polywrap.io/reference/clients/js/client-js)

### 2. Deploy a new Safe

To deploy a new Safe account invoke `deploySafe` method of `safe-factory-wrapper` with the right params to configure the new Safe. This includes defining the list of owners and the threshold of the Safe. A Safe account with three owners and threshold equal three will be used as the starting point for this example but any Safe configuration is valid.

```js
const result = await client.invoke({
  uri: 'ens/safe.wraps.eth@factory:0.1.0',
  method: "deploySafe",
  args: {
    safeAccountConfig: {
      owners: [<owner1>, <owner2>, <owner3> ],
      threshold: 1,
    }
  }
});
```

The `deploySafe` method executes a transaction from the your current ethereum account, deploys a new Safe and returns a Safe Address. Make sure to save this address as you will need it to interact with `safe-managers-wrapper`

### 3. Create a Safe transaction

To create a transaction you can invoke `createTransaction` method of `safe-managers-wrapper`. Make sure you provided environment param `safeAddress` to your call.

```js

const safeTransactionData = {
  to: '0x<address>',
  value: '<eth_value_in_wei>',
  data: '0x<data>'
}

const safeTransaction = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "createTransaction",
  args: {
      tx: safeTransactionData,
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  }
});
```

Check the `createTransaction` method in the [Wrapper Reference](#wrapper-api) for additional details on creating MultiSend transactions.

Before executing this transaction, it must be signed by the owners and this can be done off-chain or on-chain. In this example `owner1` will sign it off-chain, `owner2` will sign it on-chain and `owner3` will execute it (the executor also signs the transaction transparently).


### 3.a. Off-chain signatures

The `owner1` account signs the transaction off-chain.

```js
const signedSafeTransaction = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "addSignature",
  args: {
      tx: safeTransactionData,
    },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
});
```

Because the signature is off-chain, there is no interaction with the contract and the signature becomes available at `signedSafeTransaction.signatures`.

### 3.b. On-chain signatures

To sign transaction on-chain `owner2` should instantiate new PolywrapClient connected to ethereum ([Ethereum-plugin-config](#ethereum-plugin-config)). After `owner2` account is connected to the ethereum-plugin as a signer the transaction hash will be approved on-chain.

```js
// Get transaction hash
const txHash = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "getTransactionHash",
  args: {
      tx: signedSafeTransaction.data,
    },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
});

// Approve
await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "approveTransactionHash",
  args: {
      hash: txHash,
    },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
});
```

### 4. Transaction execution

Lastly, `owner3` account is connected to the client as a signer and executor of the Safe transaction to execute it.

```js
const executeTxResponse = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "executeTransaction",
  args: {
      tx: signedTransaction,
    },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
});
```



## <a name="safe-factory-wrapper">Safe Factory Wrapper Reference</a>

### deploySafe

Deploys a new Safe and returns an instance of the Safe Core SDK connected to the deployed Safe. The address of the Master Copy, Safe contract version and the contract (`GnosisSafe.sol` or `GnosisSafeL2.sol`) of the deployed Safe will depend on the initialization of the `safeFactory` instance.

```js
const safeAccountConfig = {
  owners,
  threshold,
  to, // Optional
  data, // Optional
  fallbackHandler, // Optional
  paymentToken, // Optional
  payment, // Optional
  paymentReceiver // Optional
}

const safeSdk = await safeFactory.deploySafe({ safeAccountConfig })
```

This method can optionally receive the `safeDeploymentConfig` parameter to define the `saltNonce`.

```js
const safeAccountConfig = {
  owners,
  threshold,
  to, // Optional
  data, // Optional
  fallbackHandler, // Optional
  paymentToken, // Optional
  payment, // Optional
  paymentReceiver // Optional
}

const safeDeploymentConfig = {
  saltNonce,
  isL1Safe, // Optional
  version, // Optional
}

const safeDeploymentResponse = await client.invoke({
  uri: 'ens/safe.wraps.eth@factory:0.1.0',
  method: 'deploySafe',
  args: { 
    safeAccountConfig, 
    safeDeploymentConfig
    },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

## <a name="safe-managers-wrapper">Safe Manager Wrapper Reference</a>


### getAddress

Returns the address of the current SafeProxy contract.

```js
const address = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getAddress',,
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getContractVersion

Returns the Safe Master Copy contract version.

```js
const version = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getContractVersion',,
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getOwners

Returns the list of Safe owner accounts.

```js
const owners = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getOwners',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getNonce

Returns the Safe nonce.

```js
const nonce = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getNonce',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getThreshold

Returns the Safe threshold.

```js
const threshold = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getThreshold',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getChainId

Returns the chainId of the connected network.

```js
const chainId = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getChainId',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getBalance

Returns the ETH balance of the Safe.

```js
const balance = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getBalance',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### getModules

Returns the list of addresses of all the enabled Safe modules.

```js
const moduleAddresses = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'getModules',
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### isModuleEnabled

Checks if a specific Safe module is enabled for the current Safe.

```js
const isEnabled = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'isModuleEnabled',
  args: {
    moduleAddress: <address>
  },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### isOwner

Checks if a specific address is an owner of the current Safe.

```js
const isOwner = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: 'isOwner',
  args: {
    ownerAddress: <address>
  },
  env: {
    safeAddress: <SAFE_ADDRESS>
  }
})
```

### createTransaction

Returns a Safe transaction ready to be signed by the owners and executed. The Safe Manager Wrapper supports the creation of single Safe transactions but also MultiSend transactions.

* **Single transactions**

  This method can take an object of type `SafeTransactionDataPartial` that represents the transaction we want to execute (once the signatures are collected). It accepts some optional properties as follows.

  ```js

  const safeTransactionData = {
    to,
    data,
    value,
    operation, // Optional
    safeTxGas, // Optional
    baseGas, // Optional
    gasPrice, // Optional
    gasToken, // Optional
    refundReceiver, // Optional
    nonce // Optional
  }
  
  const safeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'createTransaction',
    args: {
      tx: safeTransactionData
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
  ```

* **MultiSend transactions**

  This method can take an array of `SafeTransactionDataPartial` objects that represent the multiple transactions we want to include in our MultiSend transaction. If we want to specify some of the optional properties in our MultiSend transaction, we can pass a second argument to the `createMultiSendTransaction` method with the `SafeTransactionOptionalProps` object.

  ```js
  const safeTransactionsData = [
    {
      to,
      data,
      value,
      operation // Optional
    },
    {
      to,
      data,
      value,
      operation // Optional
    },
    // ...
  ]
  const safeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'createMultiSendTransaction',
    args: {
      txs: safeTransactionsData
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
    })
  ```

  This method can also receive the `options` parameter to set the optional properties in the MultiSend transaction:

  ```js
  const safeTransactionsData = [
    {
      to,
      data,
      value,
      operation // Optional
    },
    {
      to,
      data,
      value,
      operation // Optional
    },
    // ...
  ]
  const options = {
    safeTxGas, // Optional
    baseGas, // Optional
    gasPrice, // Optional
    gasToken, // Optional
    refundReceiver, // Optional
    nonce // Optional
  }
    const safeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'createMultiSendTransaction',
    args: {
      txs: safeTransactionsData,
      options
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
  ```

  In addition, the optional `onlyCalls` parameter, which is `false` by default, allows to force the use of the `MultiSendCallOnly` instead of the `MultiSend` contract when sending a batch transaction:

  ```js
  const onlyCalls = true
  const safeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'createMultiSendTransaction',
    args: {
      txs: safeTransactionsData,
      options,
      onlyCalls: onlyCalls
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
  ```

If the optional properties are not manually set, the Safe transaction returned will have the default value for each one:

* `operation`: `OperationType.Call` (0) is the default value.
* `safeTxGas`: The right gas estimation is the default value.
* `baseGas`: 0 is the default value.
* `gasPrice`: 0 is the default value.
* `gasToken`: 0x address is the default value.
* `refundReceiver`: 0x address is the default value.
* `nonce`: The current Safe nonce is the default value.

Read more about the [Safe transaction properties](https://docs.gnosis-safe.io/tutorials/tutorial_tx_service_initiate_sign).

### getTransactionHash

Returns the transaction hash of a Safe transaction.

```js
const safeTransactionData: SafeTransactionDataPartial = {
  // ...
}
const safeTransaction =  await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'createTransaction',
    args: {
      tx: safeTransactionData
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
  
const txHash = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'getTransactionHash',
    args: {
      tx: safeTransaction
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### signTransactionHash

Signs a hash using the current owner account.

```js
const signature = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'signTransactionHash',
    args: {
      hash: txHash
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### signTypedData

Signs a transaction according to the EIP-712 using the current signer account.

```js
const signature = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'signTypedData',
    args: {
      tx: safeTransaction
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### signTransaction

Returns a new `SafeTransaction` object that includes the signature of the current owner. `eth_sign` will be used by default to generate the signature.

```js
const signedSafeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'addSignature',
    args: {
      tx: safeTransaction
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

Optionally, an additional parameter can be passed to specify a different way of signing:

```js
const signedSafeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'addSignature',
    args: {
      tx: safeTransaction
      signingMethod: 'eth_signTypedData'
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

```js
const signedSafeTransaction = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'addSignature',
    args: {
      tx: safeTransaction
      signingMethod: 'eth_sign' // default option.
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### approveTransactionHash

Approves a hash on-chain using the current owner account.

```js
const txResponse = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'approveTransactionHash',
    args: {
      hash: txHash
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

Optionally, some properties can be passed as execution options:

```js
const options = {
  from, // Optional
  gasLimit, // Optional
  gasPrice, // Optional
  maxFeePerGas, // Optional
  maxPriorityFeePerGas // Optional
  nonce // Optional
}
```
```js
const txResponse = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'approveTransactionHash',
    args: {
      hash: txHash,
      options: options
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### getOwnersWhoApprovedTx

Returns a list of owners who have approved a specific Safe transaction.

```js
const ownerAddresses = await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'getOwnersWhoApprovedTx',
    args: {
      hash: txHash
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

### executeTransaction

Executes a Safe transaction.

```js
const txResponse  await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'executeTransaction',
    args: {
      tx: signedSafeTransaction
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```

Optionally, some properties can be passed as execution options:

```js
const options = {
  from, // Optional
  gasLimit, // Optional
  gasPrice, // Optional
  maxFeePerGas, // Optional
  maxPriorityFeePerGas // Optional
  nonce // Optional
}
```
```js
const txResponse  await client.invoke({
    uri: 'ens/safe.wraps.eth@manager:0.1.0',
    method: 'executeTransaction',
    args: {
      tx: signedSafeTransaction,
      options: options,
    },
    env: {
      safeAddress: <SAFE_ADDRESS>
    }
  })
```


