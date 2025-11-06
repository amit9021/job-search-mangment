/* eslint-disable @typescript-eslint/no-var-requires */
const isCI = true;

module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // השתמש בקובץ נפרד כדי להאיץ ולשלוט אילו קבצים נסרקים טיפוסית
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  settings: {
    // פותר import ל-TSType paths/aliases מ tsconfig
    // Note: typescript resolver temporarily disabled due to interface compatibility issue
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended'
  ],
  rules: {
    // ===== איכות/בטיחות (השאר כ-warn בדפול, יהפוך ל-error ב-CI) =====
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    'import/no-unresolved': 'warn',

    // ===== רעש/קונסיסטנטיות =====
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      isCI ? 'error' : 'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    'consistent-return': 'warn',

    // סדר יבוא:
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ],

    'prettier/prettier': isCI ? 'error' : 'warn'
  },

  // ===== הקלות ממוקדות לקבצים מסוימים =====
  overrides: [
    // טסטים/סקיפטים: פחות קשיח
    {
      files: ['**/*.spec.ts', '**/*.test.ts', 'scripts/**/*.ts', 'prisma/seed.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-floating-promises': 'off'
      }
    },
    // קבצי קונפיג JS (CommonJS)
    {
      files: ['*.config.js', '*.config.cjs', 'eslint.config.js'],
      parserOptions: { sourceType: 'script' },
      env: { node: true }
    }
  ],

  // התעלמות גלובלית
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.turbo/',
    'prisma/generated/**',
    '**/*.spec.ts',
    '**/*.test.ts'
  ]
};
