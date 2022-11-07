module.exports = {
  collectCoverage: false,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)"],
  modulePathIgnorePatterns: [
    "./src/__tests__/utils",
  ],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    },
  },
  testPathIgnorePatterns: [
    ".polywrap"
  ],
};
