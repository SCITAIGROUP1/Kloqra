import { base } from "@chronomint/config-eslint/base";
import { nestLayers } from "@chronomint/config-eslint/nest";
import { reactLayers } from "@chronomint/config-eslint/react";

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
