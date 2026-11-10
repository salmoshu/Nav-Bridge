module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/test"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "\\.svg$": "<rootDir>/src/test/assetMock.cjs",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  testTimeout: 10000
};
