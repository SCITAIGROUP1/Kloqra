import { base } from "@kloqra/config-eslint/base";
import { nestLayers } from "@kloqra/config-eslint/nest";
import { reactLayers } from "@kloqra/config-eslint/react";

export default [
  {
    ignores: [
      "**/prisma/generated/**",
      "**/prisma/seed.js",
      "**/prisma/seed.js.map",
      "**/seed.js",
      "**/seed.js.map",
      "**/prisma/*.js",
      "**/prisma/*.js.map"
    ]
  },
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
