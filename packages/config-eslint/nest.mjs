import globals from "globals";

const siblingModule =
  "(auth|billing|export|health|presence|projects|reporting|tasks|timelogs|timer|workspace)";

/** @type {import('eslint').Linter.Config[]} */
export const nestLayers = [
  {
    files: ["apps/api/src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^\.\./(\.\./)+${siblingModule}(/|$)`,
              message:
                "Import sibling modules via Nest module exports or apps/api/src/common/, not relative cross-module paths."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Nest DI needs runtime class refs in constructors (emitDecoratorMetadata)
      "@typescript-eslint/consistent-type-imports": "off"
    }
  },
  {
    files: ["apps/**/next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off"
    }
  }
];
