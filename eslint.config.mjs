import { base } from "@kloqra/config-eslint/base";
import { nestLayers } from "@kloqra/config-eslint/nest";
import { reactLayers } from "@kloqra/config-eslint/react";

export default [
  ...base,
  ...nestLayers,
  ...reactLayers,
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
