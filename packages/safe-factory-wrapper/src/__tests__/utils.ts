import path from "path";
import { PolywrapClientConfigBuilder, CoreClientConfig } from "@polywrap/client-js";
import { runCli } from "@polywrap/cli-js";
import { configure } from "../../client-config";

export const safeContractsPath = path.resolve(
  path.join(__dirname, "../../../safe-contracts-wrapper")
);

export function getClientConfig(): CoreClientConfig {
  return configure(new PolywrapClientConfigBuilder()).build();
}

export async function initInfra(): Promise<void> {
  const { exitCode, stderr, stdout } = await runCli({
    args: ["infra", "up", "--verbose", "--modules", "eth-ens-ipfs"],
  });

  if (exitCode) {
    throw Error(
      `initInfra failed to start test environment.\nExit Code: ${exitCode}\nStdErr: ${stderr}\nStdOut: ${stdout}`
    );
  }

  await new Promise<void>(function (resolve) {
    setTimeout(() => resolve(), 5000);
  });

  return Promise.resolve();
}

export async function stopInfra(): Promise<void> {
  const { exitCode, stderr, stdout } = await runCli({
    args: ["infra", "down", "--verbose", "--modules", "eth-ens-ipfs"],
  });

  if (exitCode) {
    throw Error(
      `initInfra failed to stop test environment.\nExit Code: ${exitCode}\nStdErr: ${stderr}\nStdOut: ${stdout}`
    );
  }
  return Promise.resolve();
}
