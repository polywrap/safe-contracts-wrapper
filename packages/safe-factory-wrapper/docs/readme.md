# Polywrap Gnosis Safe Factory Wrap

The Gnosis Safe Factory wrap allows you to deploy Safes from any environment.

## Requirements

To run the Gnosis Safe Factory wrap you'll need a Polywrap client in your application. See here for installation information: [https://docs.polywrap.io/clients](https://docs.polywrap.io/clients)

### Configuration

Gnosis Safe Factory depends upon the [ethereum wrap](https://github.com/polywrap/ethers), which in-turn requires an [ethereum-provider plugin](https://github.com/polywrap/ethereum-wallet). Plugins are added directly to the client using its config.

[Here's an example](https://github.com/polywrap/ethers/blob/36e6f3331264732e73f3e236004416e82930ed64/provider/implementations/js/tests/index.spec.ts#L15-L30) of setting up a JavaScript / TypeScript client with the ethereum-provider plugin.

You can learn more about Polywrap clients & configs in the docs [here](https://docs.polywrap.io/tutorials/use-wraps/configure-client).

## Run!

With your client successfully configured, you can now run any function on the Gnosis Safe Factory wrap with ease.
See the example below, or take a look at the [Gnosis Safe Factory wrap's tests](https://github.com/polywrap/safe-contracts-wrapper/blob/main/packages/safe-factory-wrapper/src/__tests__/e2e/integration.spec.ts) for more examples.

## Example - Deploy a new Safe

To deploy a new Safe account invoke `deploySafe` method with the right params to configure the new Safe. This includes defining the list of owners and the threshold of the Safe. A Safe account with three owners and threshold equal three will be used as the starting point for this example but any Safe configuration is valid.

```js
const result = await client.invoke({
  uri: 'ens/safe.wraps.eth@factory:0.1.0',
  method: "deploySafe",
  args: {
    safeAccountConfig: {
      owners: ["<owner1>", "<owner2>", "<owner3>" ],
      threshold: 3,
    }
  }
});
```

The `deploySafe` method executes a transaction from the your current ethereum account, deploys a new Safe and returns a Safe Address. Make sure to save this address as you will need it to interact with `safe-managers-wrapper`

## Support

For any questions or problems related to the Gnosis Safe Factory wrap or Polywrap at large, please visit our [Discord](https://discord.polywrap.io).
