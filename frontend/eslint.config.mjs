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
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      /**
       * The logo and the station photos are small local SVG files that are
       * already tiny, and the station photos can change size per station.
       * next/image would add a loader for no real gain here, so the plain
       * img element is kept on purpose.
       */
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
