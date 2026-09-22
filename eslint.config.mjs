import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/out/**', '.npm-cache/**', '**/next-env.d.ts', '**/studio-entry/**'] },
  js.configs.recommended, ...ts.configs.recommended,
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern:'^_'}] } },
  { files: ['scripts/*.mjs'], languageOptions: {globals: {process:'readonly', console:'readonly', URL:'readonly'}} }
);
