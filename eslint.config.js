import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});


export default [
  {
    name: 'global ignore',
    ignores: [
      'build/**/*',
      'coverage/**/*',
      'dist/**/*',
      'docs/**/*',
      'node_modules/**/*',
      'tmp/**/*',
      'types/**/*',
      '**/*.d.ts',
      '*.{js,cjs,mjs}', // don't lint root level js files (vite.config.js, eslint.config.js, etc...)
    ],
  },
  {
    name: 'global lang options',
    files: ['src/**/*.{js,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      parser: tsParser,
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.browser,
        ...globals.node,
        argv: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
  },
  eslintJs.configs.recommended,
  eslintPluginUnicorn.configs['flat/recommended'],
  ...tseslint.configs.recommended,

//   settings: {
//     'import/resolver': {
//       node: {
//         extensions: ['.js', '.ts'],
//       },
//     },
//   },

  {
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'no-shadow': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 0,
    'import/no-unresolved': 0,
    'import/prefer-default-export': 0,
    'arrow-parens': ['error', 'always'],
    'arrow-body-style': [2, 'as-needed'],

    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'ignore',
    }],

    'no-param-reassign': ['error', {
      props: false,
    }],

    'max-len': 0,
    'class-methods-use-this': 0,

    'no-mixed-operators': ['error', {
      groups: [
        ['%', '**'],
        ['%', '+'],
        ['%', '-'],
        ['%', '*'],
        ['%', '/'],
        ['**', '+'],
        ['**', '-'],
        ['**', '*'],
        ['**', '/'],
        ['&', '|', '^', '~', '<<', '>>', '>>>'],
        ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
        ['&&', '||'],
        ['in', 'instanceof'],
      ],

      allowSamePrecedence: true,
    }],

    'no-underscore-dangle': 'off',

    'no-restricted-syntax': ['error', {
      selector: 'ForInStatement',
      message: 'for..in iterates over the entire prototype chain, use for..of or Object.{ keys, values, entries } instead.',
    }, {
      selector: 'LabeledStatement',
      message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
    }, {
      selector: 'WithStatement',
      message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
    }],

    'padding-line-between-statements': [2, {
      blankLine: 'always',
      prev: 'directive',
      next: '*',
    }, {
      blankLine: 'any',
      prev: 'directive',
      next: 'directive',
    }, {
      blankLine: 'always',
      prev: 'import',
      next: '*',
    }, {
      blankLine: 'any',
      prev: 'import',
      next: 'import',
    }, {
      blankLine: 'always',
      prev: '*',
      next: ['const', 'let', 'var', 'export'],
    }, {
      blankLine: 'always',
      prev: ['const', 'let', 'var', 'export'],
      next: '*',
    }, {
      blankLine: 'any',
      prev: ['const', 'let', 'var', 'export'],
      next: ['const', 'let', 'var', 'export'],
    }, {
      blankLine: 'always',
      prev: '*',
      next: ['class', 'for', 'do', 'while', 'switch', 'try'],
    }, {
      blankLine: 'always',
      prev: ['class', 'for', 'do', 'while', 'switch', 'try'],
      next: '*',
    }, {
      blankLine: 'any',
      prev: '*',
      next: 'break',
    }, {
      blankLine: 'any',
      prev: '*',
      next: 'return',
    }],

    'lines-between-class-members': ['error', 'always', {
      exceptAfterSingleLine: true,
    }],

    'unicorn/filename-case': ['off', {
      case: 'camelCase',
    }],

    'unicorn/no-null': 'off',
    'unicorn/no-useless-undefined': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/no-this-assignment': 'off',
    'unicorn/prefer-dom-node-remove': 'off',
  },
  },
];
