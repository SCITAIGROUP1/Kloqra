# Project-Scoped Rules

## Mandatory Compilation and Testing Before Pushing

**CRITICAL RULE**: Do not push code without strictly verifying compilation and tests locally first.

- **Why**: Bypassing compilation checks wastes CI minutes on obvious TypeScript or linting errors.
- **Action**: Before running `git push` (especially when using bypass flags like `--no-verify` or `SKIP_TEST_CHECK=1`), you MUST manually execute local TypeScript checks (e.g., `tsc -p tsconfig.json --noEmit` on the modified packages) or run the relevant local test suite to guarantee the code builds successfully without errors.
- **Fallback**: If global or turbo-level test/build scripts fail due to environment issues (e.g., `pnpm` not found in turbo), you must CD directly into the specific package/app directory (e.g., `cd apps/admin`) and run the localized compiler (`tsc --noEmit` or `vitest`) to verify the integrity of your changes before pushing.
