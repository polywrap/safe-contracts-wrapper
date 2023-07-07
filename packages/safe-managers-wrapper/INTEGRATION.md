# Polywrap Gnosis Safe Manager Wrap

The Gnosis Safe Manager wrap allows you to interact with Safes from any environment.

## Requirements

To run the Gnosis Safe Manager wrap you'll need a Polywrap client in your application. See here for installation information: [https://docs.polywrap.io/clients](https://docs.polywrap.io/clients)

### Configuration

Gnosis Safe Manager depends upon the [ethereum wrap](https://github.com/polywrap/ethers), which in-turn requires an [ethereum-provider plugin](https://github.com/polywrap/ethereum-wallet). Plugins are added directly to the client using its config.

[Here's an example](https://github.com/polywrap/ethers/blob/36e6f3331264732e73f3e236004416e82930ed64/provider/implementations/js/tests/index.spec.ts#L15-L30) of setting up a JavaScript / TypeScript client with the ethereum-provider plugin.

You can learn more about Polywrap clients & configs in the docs [here](https://docs.polywrap.io/tutorials/use-wraps/configure-client).

## Run!

With your client successfully configured, you can now run any function on the Gnosis Safe Manager wrap with ease.
See the example below, or take a look at the [Gnosis Safe Manager wrap's tests](https://github.com/polywrap/safe-contracts-wrapper/tree/main/packages/safe-managers-wrapper/src/__tests__) for more examples.

## Example - create and sign a Safe transaction

In this example we will assume that we have a Safe deployed with 3 owners: `owner1`, `owner2`, and `owner3`.

### 1. Create a Safe transaction

To create a transaction you can invoke `createTransaction` method. Make sure you provided the environment variable `safeAddress` to your call.

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
      safeAddress: "<SAFE_ADDRESS>"
    }
  }
});
```

Before executing this transaction, it must be signed by the owners and this can be done off-chain or on-chain. In this example `owner1` will sign it off-chain, `owner2` will sign it on-chain and `owner3` will execute it (the executor also signs the transaction transparently).

### 2. Off-chain signatures

The `owner1` account signs the transaction off-chain.

```js
const signedSafeTransaction = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "addSignature",
  args: {
      tx: safeTransactionData,
    },
  env: {
    safeAddress: "<SAFE_ADDRESS>"
  }
});
```

Because the signature is off-chain, there is no interaction with the contract and the signature becomes available at `signedSafeTransaction.signatures`.

### 3. On-chain signatures

To sign transaction on-chain `owner2` should instantiate new PolywrapClient connected to ethereum. After `owner2` account is connected to the ethereum-plugin as a signer the transaction hash will be approved on-chain.

```js
// Get transaction hash
const txHash = await client.invoke({
  uri: 'ens/safe.wraps.eth@manager:0.1.0',
  method: "getTransactionHash",
  args: {
      tx: signedSafeTransaction.data,
    },
  env: {
    safeAddress: "<SAFE_ADDRESS>"
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
    safeAddress: "<SAFE_ADDRESS>"
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
    safeAddress: "<SAFE_ADDRESS>"
  }
});
```

### Note
Currently, the wraps dont allow the collection of owner signatures off-chain. To do this and be able to see and confirm the pending transactions shown in the [Safe Web App](https://gnosis-safe.io/app/), it is recommended that you follow this other [guide](https://github.com/safe-global/safe-core-sdk/blob/main/guides/integrating-the-safe-core-sdk.md#5-propose-the-transaction-to-the-service) that covers the use of the Safe Core SDK, combined with the Safe Service Client.

## Support

For any questions or problems related to the Gnosis Safe Manager wrap or Polywrap at large, please visit our [Discord](https://discord.polywrap.io).
