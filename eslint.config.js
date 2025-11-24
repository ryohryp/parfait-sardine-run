import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Disable react-hooks/set-state-in-effect as it has false positives for legitimate use cases
      // like loading data when a modal opens or controlling animations
      'react-hooks/set-state-in-effect': 'off',
      // Disable react-hooks/purity as it has false positives for performance.now() in render
      'react-hooks/purity': 'off',
    },
  },
])
