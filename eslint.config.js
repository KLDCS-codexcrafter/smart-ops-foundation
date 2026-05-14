import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// [Hardening-A · Block A] Custom rule: flag hardcoded entity-private localStorage keys.
// Flags `localStorage.getItem|setItem|removeItem('erp_employees|erp_attendance_records|erp_divisions|erp_departments...')`
// where the call uses a string literal instead of the scoped helper (employeesKey/attendanceRecordsKey/divisionsKey/departmentsKey).
// Severity: warn (escalation to error in Hardening-B once long-tail migrated).
const SCOPED_KEY_PREFIXES = /^(erp_employees|erp_attendance_records|erp_divisions|erp_departments)(?:$|[^_a-zA-Z0-9])/;
const hardeningAPlugin = {
  rules: {
    "no-hardcoded-scoped-key": {
      meta: {
        type: "problem",
        docs: { description: "Disallow hardcoded entity-scoped localStorage keys; use scoped helpers." },
        schema: [],
        messages: {
          hardcoded: "Hardcoded entity-private key '{{key}}' — use scoped helper (employeesKey/attendanceRecordsKey/divisionsKey/departmentsKey).",
        },
      },
      create(context) {
        return {
          CallExpression(node) {
            const callee = node.callee;
            if (
              callee.type === "MemberExpression" &&
              callee.object.type === "Identifier" &&
              callee.object.name === "localStorage" &&
              callee.property.type === "Identifier" &&
              ["getItem", "setItem", "removeItem"].includes(callee.property.name) &&
              node.arguments.length > 0 &&
              node.arguments[0].type === "Literal" &&
              typeof node.arguments[0].value === "string" &&
              SCOPED_KEY_PREFIXES.test(node.arguments[0].value)
            ) {
              context.report({ node: node.arguments[0], messageId: "hardcoded", data: { key: node.arguments[0].value } });
            }
          },
        };
      },
    },
  },
};

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
      "hardening-a": hardeningAPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true
      }],
      "hardening-a/no-hardcoded-scoped-key": "warn",
    },
  },
  // D-139 — vendor scope: shadcn/ui CLI-generated files are upstream-managed.
  // Suppress react-refresh/only-export-components for src/components/ui/** to preserve
  // shadcn upgrade path (no source modifications to vendor files).
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
