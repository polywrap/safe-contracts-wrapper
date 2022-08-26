import type { HardhatUserConfig } from "hardhat/types";
import { task } from "hardhat/config";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables.
dotenv.config();
const { SOLIDITY_VERSION, SOLIDITY_SETTINGS } = process.env;

const primarySolidityVersion = SOLIDITY_VERSION || "0.7.6"
const soliditySettings = !!SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined

const userConfig: HardhatUserConfig = {
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    sources: "contracts",
  },
  solidity: {
    compilers: [
      { version: primarySolidityVersion, settings: soliditySettings },
      { version: "0.6.12" },
      { version: "0.5.17" },
    ]
  }
};

task("build-abi", "")
    .setAction(async (_, hre) => {
        await hre.run("compile")
        // await hre.run("compile")
        const artifact = await hre.artifacts.readArtifact("GnosisSafeProxyFactory")
        const abi = JSON.stringify(artifact.abi);
        const bytecode = artifact.bytecode;

        // Generate an Assemblyscript file containing the abi + bytecode
        fs.writeFileSync(
            `${__dirname}/wrapper/__tests__/e2e/GnosisSafeProxyFactory.ts`,
            `/// NOTE: This file is auto-generated, see build-contract.js
export const abi = \`${abi}\`;
export const bytecode = "${bytecode}";
`
        );

        console.log("✔️ Generated GnosisSafeProxyFactory.ts");

        // Generate a JSON ABI file
        fs.writeFileSync(
            `${__dirname}/wrapper/__tests__/e2e/GnosisSafeProxyFactory.json`,
            JSON.stringify({
                abi,
                bytecode: `${bytecode}`
            })
        );

        console.log("✔️ Generated GnosisSafeProxyFactory.json");
    });

export default userConfig
