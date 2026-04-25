import { config } from "@workspace/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["scripts/**/*.mjs", "vite.config.ts", "eslint.config.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
