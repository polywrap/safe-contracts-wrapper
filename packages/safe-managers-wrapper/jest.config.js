module.exports = {
  collectCoverage: false,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/e2e/**/?(*.)+(spec|test).[jt]s?(x)","**/__tests__/integration/**/?(*.)+(spec|test).[jt]s?(x)" ],
  modulePathIgnorePatterns: [
    "./src/__tests__/utils",
    "/.polywrap/"
  ],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    },
  },
};
