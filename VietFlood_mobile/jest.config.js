/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.expo/",
    "<rootDir>/app/components/Text.test.tsx", // TODO: Fix Jest/NativeWind integration
  ],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^expo-modules-core$": "<rootDir>/node_modules/expo-modules-core",
    "^expo-modules-core/(.*)$": "<rootDir>/node_modules/expo-modules-core/$1",
    "^@reduxjs/toolkit$": "<rootDir>/node_modules/@reduxjs/toolkit/dist/cjs/index.js",
    "^immer$": "<rootDir>/node_modules/immer/dist/cjs/index.js",
    "^react-redux$": "<rootDir>/node_modules/react-redux/dist/cjs/index.js",
    "^redux$": "<rootDir>/node_modules/redux/dist/cjs/redux.cjs",
    "^@/(.*)$": "<rootDir>/app/$1",
  },
}
