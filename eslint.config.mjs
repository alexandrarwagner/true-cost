import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    // The designer's page and scripts are source as delivered, not ours to lint.
    "design/**",
    "public/engine.js",
    "public/vendor/**",
    "tests/design/baseline.html",
    "tests/design/blocks/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strict,
  {
    rules: {
      // Explain every `any` in a comment, or don't use it.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      // Everything renders as text through React.
      "react/no-danger": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // lib/core is pure: no framework, no network, no env, no React.
    files: ["lib/core/**/*.ts", "content/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react/*", "react-dom"],
              message: "lib/core is framework-free.",
            },
            {
              group: [
                "@/lib/adapters/*",
                "@/lib/server/*",
                "@/app/*",
                "../adapters/*",
                "../server/*",
              ],
              message: "Dependencies point inward: core must not import adapters, server or app.",
            },
            { group: ["server-only"], message: "lib/core does not read env or secrets." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "lib/core makes no network calls." },
        { name: "process", message: "lib/core does not read env." },
      ],
    },
  },
  {
    // Scripts and tests may use console and process.
    files: ["scripts/**/*.ts", "scripts/**/*.mjs", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
]);

export default eslintConfig;
