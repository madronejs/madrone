import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import importRules from 'eslint-plugin-import';
import airbnbAll from './config/eslint/airbnbRules/index.js';
import style from './config/eslint/style.js';


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
      parser: tseslint.parser,
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.browser,
        ...globals.node,
        argv: 'readonly',
      },
    },
    plugins: {
      import: fixupPluginRules(importRules),
      '@typescript-eslint': tseslint.plugin
    },
  },
  js.configs.recommended,
  // get airbnb out of the way firsts so we can override things we don't like - this should eventually be deprecated and removed
  { rules: airbnbAll },
  eslintPluginUnicorn.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  ...style,
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
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@typescript-eslint/no-dupe-class-members': 'error',
    '@typescript-eslint/no-empty-interface': ['error', {
      allowSingleExtends: true,
    }],
    '@typescript-eslint/no-empty-object-type': ['error', {
      allowInterfaces: 'with-single-extends',
    }],
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-shadow': ['error'],
    'no-shadow': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    // 'import/extensions': 'off',
    // 'import/no-extraneous-dependencies': 0,
    // 'import/no-unresolved': 0,
    // 'import/prefer-default-export': 0,
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

    // Idiom conflict - the framework does this deliberately.
    'unicorn/no-this-outside-of-class': 'off', // standalone accessor functions use `this` by design
    'unicorn/no-top-level-assignment-in-function': 'off', // scheduler/global state (SCHEDULER_ID, TASK_QUEUE) is intentionally module-level
    'unicorn/no-top-level-side-effects': 'off', // index.ts registration + framework bootstrap
    'unicorn/no-undeclared-class-members': 'off', // mixin specs add members dynamically (the point of the test)
    'unicorn/prefer-private-class-fields': 'off', // madrone uses the `_`-prefix convention (no-underscore-dangle is off)
    'unicorn/name-replacements': 'off', // naming opinion - reverses the deliberate `prevent-abbreviations: off`

    // False positive against this codebase.
    'unicorn/no-nonstandard-builtin-properties': 'off', // Symbol.metadata is the standard TC39 decorator-metadata symbol
    'unicorn/no-invalid-argument-count': 'off', // misfires on spread arguments

    // Consumer compat - a library must not emit ES2025 runtime APIs its consumers may lack.
    'unicorn/prefer-iterator-to-array': 'off', // Iterator#toArray() is not yet universal in browsers

    // Core reactivity behavior - changing the existence check (`in` vs Object.hasOwn) alters prototype-chain semantics.
    'unicorn/no-computed-property-existence-check': 'off',

    // The reactivity specs deliberately exercise these patterns - "fixing" them would delete what the test verifies.
    'unicorn/prefer-await': 'off', // specs test .then()/.catch()/.finally() on reactive-wrapped promises
    'unicorn/prefer-promise-try': 'off', // same promise-interop specs
    'unicorn/no-unused-array-method-return': 'off', // specs invoke .filter()/.entries() purely to trigger reactive tracking
    'unicorn/prefer-minimal-ternary': 'off', // a conditional-dependency tracking spec

    // Pure member-ordering opinion - fights the deliberate "constructor + documented field block" layout.
    'unicorn/consistent-class-member-order': 'off',

    // Scheduler specs use a deliberate terse `schedule(() => order.push(n))` idiom; the push return is
    // already discarded, and complying would force 18 call sites to multi-line blocks (vs max-statements-per-line).
    'unicorn/no-return-array-push': 'off',
  },
  },
];
