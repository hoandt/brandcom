import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      // Legacy routes still contain loosely typed third-party payloads. Keep
      // these visible during linting without blocking production builds;
      // TypeScript compilation remains strict and build-blocking.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
