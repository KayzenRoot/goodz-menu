import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: nextPlugin.configs.recommended.rules,
  },
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "playwright-report/**", "test-results/**", "gmz-scaffold/**", "next-env.d.ts"],
  },
];
