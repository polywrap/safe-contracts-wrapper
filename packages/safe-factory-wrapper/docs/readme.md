# Polywrap Gnosis Safe Factory Wrap

## Table of contents
* [Installation](#installation)
* [Getting Started](#getting-started)
* [Safe Factory Wrap Reference](#safe-factory-wrap)
## <a name="installation">Installation</a>

Install the package with yarn or npm:

```bash
yarn add polywrap
npm install polywrap
```

## <a name="getting-started">Getting Started</a>

The following steps show how to set up the Polywrap Client, deploy a new Safe, create a Safe transaction, generate the required signatures from owners and execute the transaction.

### Note
Currently, the wraps dont allow the collection of owner signatures off-chain. To do this and be able to see and confirm the pending transactions shown in the [Safe Web App](https://gnosis-safe.io/app/), it is recommended that you follow this other [guide](https://github.com/safe-global/safe-core-sdk/blob/main/guides/integrating-the-safe-core-sdk.md#5-propose-the-transaction-to-the-service) that covers the use of the Safe Core SDK, combined with the Safe Service Client.

### 1. Instantiate a Polywrap Client

First of all, we need to create a `Polywrap Client`, which contains all the required utilities for the SDKs to interact with the blockchain. It acts as a wrap for [web3.js](https://web3js.readthedocs.io/) or [ethers.js](https://docs.ethers.io/v5/) Ethereum libraries.

Use an import or require statement, depending on which your environment supports.

```js
import { PolywrapClient } from "@polywrap/client-js";
```

Then, you will be able to use the PolywrapClient like so:
```js
// Simply instantiate the PolywrapClient.
const client = new PolywrapClient();
```
[Polywrap client docs](https://github.com/polywrap/javascript-client/tree/origin-dev/packages/client)

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

Check the `createTransaction` method in the [Wrap Reference](#wrap-api) for additional details on creating MultiSend transactions.

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



## <a name="safe-factory-wrap">Safe Factory Wrap Reference</a>

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
