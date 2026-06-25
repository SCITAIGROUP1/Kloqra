import { base } from "@kloqra/config-eslint/base";
import { nestLayers } from "@kloqra/config-eslint/nest";
import { reactLayers } from "@kloqra/config-eslint/react";

export default [
  {
    ignores: [
      "**/prisma/generated/**",
      "**/prisma/generated/**/*",
      "**/generated/**",
      "**/edge.js",
      "**/index-browser.js",
      "**/wasm.js",
      "**/query_engine_bg.js",
      "**/prisma/*.map"
    ]
  },
  ...base,
  ...nestLayers,
  ...reactLayers,
  {
    files: ["**/prisma/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "writable",
        exports: "writable",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off"
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly"
      }
    }
  }
];
