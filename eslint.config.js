/**
 * @file     eslint.config.js
 * @purpose  TypeScript strict mode configuration enforcing Sheet 2 Rule 7 (CI blocks `any`).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Updated Apr-2026 (T-H1.5-Z-Z1)
 * @sprint   T-H1.5-Z-Z1
 * @iso      Maintainability (HIGH+) · Reliability (HIGH+) · Functional Suitability (HIGH preserve)
 * @whom     Engineering team (founder today, Phase-2 devs tomorrow)
 * @depends  TypeScript 5.x compiler · @typescript-eslint/parser
 * @consumers tsc · eslint · IDE · CI
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
      }],
    },
  },
);
