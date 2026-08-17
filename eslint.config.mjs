import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Intentional pattern: animation resets and Zustand hydration use sync setState in effects
      'react-hooks/set-state-in-effect': 'off',
      // False positive: event handler functions that contain ref access are incorrectly flagged when passed as JSX props
      'react-hooks/refs': 'off',
    },
  },
  {
    files: ['app/contract/page.tsx', 'app/scene/page.tsx'],
    rules: {
      // These timestamps are created only inside explicit user-triggered save/export handlers,
      // never while rendering. The compiler rule currently treats the nested handlers as render code.
      'react-hooks/purity': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig
