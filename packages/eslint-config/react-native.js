import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * ESLint flat config for Expo / React Native apps.
 * Intentionally omits eslint-plugin-turbo (Metro/Expo runs ESLint outside Turbo context).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactNativeConfig = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      onlyWarn,
    },
  },
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        __DEV__: "readonly",
      },
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    ignores: ["dist/**", ".expo/**", "ios/**", "android/**", "node_modules/**"],
  },
];
