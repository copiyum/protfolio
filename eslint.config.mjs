import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — import them directly.
// (The old FlatCompat `.extends()` path crashes its validator with v16.)
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // These patterns are intentional: hydration guards, media-query sync,
      // localStorage init — all legitimate "sync with external system" effects.
      "react-hooks/set-state-in-effect": "off",
      // Flags Date.now() inside event handlers as "impure during render" — false positive.
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
