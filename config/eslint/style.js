import stylistic from '@stylistic/eslint-plugin';

export default [
  stylistic.configs['disable-legacy'],
  stylistic.configs['recommended-flat'],
  {
    name: 'sdvi/style',
    rules: {
      // enforce line breaks after opening and before closing array brackets
      // https://eslint.style/rules/default/array-bracket-newline
      '@stylistic/array-bracket-newline': ['off', { multiline: true, minItems: 3 }],

      // enforce spacing inside array brackets
      // https://eslint.style/rules/default/array-bracket-spacing
      '@stylistic/array-bracket-spacing': ['error', 'never'],

      // enforce line breaks between array elements
      // https://eslint.style/rules/default/array-element-newline
      '@stylistic/array-element-newline': ['off', { multiline: true, minItems: 3 }],

      // enforce parens in arrow function arguments
      // https://eslint.style/rules/default/arrow-parens
      '@stylistic/arrow-parens': ['error', 'always'],

      // enforce spacing before and after the arrow in arrow functions
      // https://eslint.style/rules/default/arrow-spacing
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],

      // enforce spacing inside single-line blocks
      // https://eslint.style/rules/default/block-spacing
      '@stylistic/block-spacing': ['error', 'always'],

      // enforce one true brace style
      // https://eslint.style/rules/default/brace-style
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],

      // enforce dangling commas for multiline objects, but ignore functions
      // https://eslint.style/rules/default/comma-dangle
      '@stylistic/comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        enums: 'ignore', // MAINTENANCE: JLM ESLint 9.x rule is misdiagnosing enums in .vue files - submit defect
        generics: 'always-multiline',
        tuples: 'always-multiline',
        functions: 'ignore',
      }],

      // enforce spacing before and after comma
      // https://eslint.style/rules/default/comma-spacing
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],

      // enforce one true comma style
      // https://eslint.style/rules/default/comma-style
      '@stylistic/comma-style': ['error', 'last', {
        exceptions: {
          ArrayExpression: false,
          ArrayPattern: false,
          ArrowFunctionExpression: false,
          CallExpression: false,
          FunctionDeclaration: false,
          FunctionExpression: false,
          ImportDeclaration: false,
          ObjectExpression: false,
          ObjectPattern: false,
          VariableDeclaration: false,
          NewExpression: false,
        },
      }],

      // disallow padding inside computed properties
      // https://eslint.style/rules/default/computed-property-spacing
      '@stylistic/computed-property-spacing': ['error', 'never'],

      // https://eslint.style/rules/default/dot-location
      '@stylistic/dot-location': ['error', 'property'],

      // enforce newline at the end of file, with no multiple empty lines
      // https://eslint.style/rules/default/eol-last
      '@stylistic/eol-last': ['error', 'always'],

      // https://eslint.org/docs/rules/function-call-argument-newline
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],

      // enforce spacing between functions and their invocations
      // https://eslint.org/docs/rules/func-call-spacing
      '@stylistic/func-call-spacing': ['error', 'never'],

      // https://eslint.style/rules/default/function-paren-newline
      '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],

      // enforce space before '*' and not after
      // https://eslint.style/rules/default/generator-star-spacing
      '@stylistic/generator-star-spacing': ['error', 'before'],


      // enforce the location of arrow function bodies with implicit returns
      // https://eslint.style/rules/default/implicit-arrow-linebreak
      '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],

      // enforce 2 space (no tabs) indentation
      // https://eslint.style/rules/default/indent
      '@stylistic/indent': [
        'error', 2, { //TODO: mis indenting enum closing brace :/
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          MemberExpression: 1,
          FunctionDeclaration: {
            parameters: 1,
            body: 1,
          },
          FunctionExpression: {
            parameters: 1,
            body: 1,
          },
          CallExpression: {
            arguments: 1,
          },
          ArrayExpression: 1,
          ObjectExpression: 1,
          ImportDeclaration: 1,
          flatTernaryExpressions: false,
          offsetTernaryExpressions: true,
          // list derived from https://github.com/benjamn/ast-types/blob/HEAD/def/jsx.js
          ignoredNodes: [
            'JSXElement',
            'JSXElement > *',
            'JSXAttribute',
            'JSXIdentifier',
            'JSXNamespacedName',
            'JSXMemberExpression',
            'JSXSpreadAttribute',
            'JSXExpressionContainer',
            'JSXOpeningElement',
            'JSXClosingElement',
            'JSXFragment',
            'JSXOpeningFragment',
            'JSXClosingFragment',
            'JSXText',
            'JSXEmptyExpression',
            'JSXSpreadChild',
          ],
          ignoreComments: false,
        },
      ],

      // enforce properly indented multiline binary operators
      // https://eslint.style/rules/default/indent-binary-ops
      '@stylistic/indent-binary-ops': ['error', 2],

      '@stylistic/jsx-curly-spacing': ['error', 'always'],

      // don't enforce one expression per line
      // https://eslint.style/rules/default/jsx-one-expression-per-line
      '@stylistic/jsx-one-expression-per-line': ['off', { allow: 'single-child' }], // This rule makes it difficult to write stories in JSX, so keep it off

      // specify whether double or single quotes should be used in JSX attributes
      // https://eslint.style/rules/default/jsx-quotes
      '@stylistic/jsx-quotes': ['off', 'prefer-double'],

      '@stylistic/jsx-tag-spacing': ['error'],

      // lots of jsx style rules skipped her:
      // see https://eslint.style/rules/default/jsx-child-element-spacing
      // through https://eslint.style/rules/default/jsx-wrap-multilines

      // enforces spacing between keys and values in object literal properties
      // https://eslint.style/rules/default/key-spacing
      '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],

      // require a space before & after certain keywords
      // https://eslint.style/rules/default/keyword-spacing
      '@stylistic/keyword-spacing': ['error', {
        before: true,
        after: true,
        overrides: {
          return: { after: true },
          throw: { after: true },
          case: { after: true },
        },
      }],

      // enforce position of line comments
      // https://eslint.style/rules/default/line-comment-position
      // TODO: enable?
      '@stylistic/line-comment-position': ['off', {
        position: 'above',
        ignorePattern: '',
        applyDefaultPatterns: true,
      }],

      // disallow mixed 'LF' and 'CRLF' as linebreaks
      // https://eslint.style/rules/default/linebreak-style
      '@stylistic/linebreak-style': ['error', 'unix'],

      // enforces empty lines around comments
      // https://eslint.style/rules/default/lines-around-comment
      '@stylistic/lines-around-comment': 'off',

      // require or disallow an empty line between class members
      // https://eslint.style/rules/default/lines-between-class-members
      '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],

      // specify the maximum length of a line in your program
      // https://eslint.style/rules/default/max-len
      '@stylistic/max-len': ['error', {
        code: 150,
        tabWidth: 2,
        ignoreComments: true,
        ignoreUrls: true,
      }],

      // restrict the number of statements per line
      // https://eslint.style/rules/default/max-statements-per-line
      '@stylistic/max-statements-per-line': ['error', { max: 1 }],
      // enforce
      // https://eslint.style/rules/default/member-delimiter-style
      '@stylistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'comma',
          requireLast: true,
        },
        singleline: {
          delimiter: 'comma',
          requireLast: false,
        },
      }],

      // enforce a particular style for multiline comments
      // https://eslint.style/rules/default/multiline-comment-style
      '@stylistic/multiline-comment-style': ['off', 'starred-block'],

      // require multiline ternary
      // https://eslint.style/rules/default/multiline-ternary
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],

      // disallow the omission of parentheses when invoking a constructor with no arguments
      // https://eslint.style/rules/default/new-parens
      '@stylistic/new-parens': 'error',

      // enforces new line after each method call in the chain to make it
      // more readable and easy to maintain
      // https://eslint.style/rules/default/newline-per-chained-call
      '@stylistic/newline-per-chained-call': ['off', { ignoreChainWithDepth: 2 }], // stacked chained calls are nice, but not always practical in our code :/

      // don't allow confusing arrow functions
      // https://eslint.style/rules/default/no-confusing-arrow
      '@stylistic/no-confusing-arrow': ['error', { allowParens: true, onlyOneSimpleParam: false }],

      // don't allow extra parentheses
      // https://eslint.style/rules/default/no-extra-parens
      '@stylistic/no-extra-parens': ['off', 'all', {
        conditionalAssign: true,
        nestedBinaryExpressions: false,
        ternaryOperandBinaryExpressions: false,
        returnAssign: false,
        ignoreJSX: 'all',
        enforceForArrowConditionals: false,
      }],

      // disallow unnecessary semicolons
      // https://eslint.style/rules/default/no-extra-semi
      '@stylistic/no-extra-semi': 'error',

      // disallow floating decimals
      // https://eslint.style/rules/default/no-floating-decimal
      '@stylistic/no-floating-decimal': 'error',

      // disallow un-paren'd mixes of different operators
      // https://eslint.org/docs/rules/no-mixed-operators
      '@stylistic/no-mixed-operators': ['error', {
        // the list of arithmetic groups disallows mixing `%` and `**`
        // with other arithmetic operators.
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

      // disallow mixed spaces and tabs for indentation
      // https://eslint.style/rules/default/no-mixed-spaces-and-tabs
      '@stylistic/no-mixed-spaces-and-tabs': 'error',

      // disallow multiple spaces that aren't used for indentation
      // https://eslint.style/rules/default/no-multi-spaces
      '@stylistic/no-multi-spaces': ['error'],

      // disallow multiple empty lines
      // https://eslint.style/rules/default/no-multiple-empty-lines
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],

      // disallow tab characters entirely
      // https://eslint.style/rules/default/no-tabs
      '@stylistic/no-tabs': 'error',

      // disallow trailing whitespace at the end of lines
      // https://eslint.style/rules/default/no-trailing-spaces
      '@stylistic/no-trailing-spaces': ['error', {
        skipBlankLines: false,
        ignoreComments: false,
      }],

      // disallow whitespace before properties
      // https://eslint.style/rules/default/no-whitespace-before-property
      '@stylistic/no-whitespace-before-property': 'error',

      // enforce the location of single-line statements
      // https://eslint.style/rules/default/nonblock-statement-body-position
      '@stylistic/nonblock-statement-body-position': ['error', 'beside', { overrides: {} }],

      // enforce line breaks between braces
      // https://eslint.style/rules/default/object-curly-newline
      '@stylistic/object-curly-newline': ['error', {
        ObjectExpression: { minProperties: 4, multiline: true, consistent: true },
        ObjectPattern: { minProperties: 4, multiline: true, consistent: true },
        ImportDeclaration: { minProperties: 4, multiline: true, consistent: true },
        ExportDeclaration: { minProperties: 4, multiline: true, consistent: true },
      }],

      // require padding inside curly braces
      // https://eslint.style/rules/default/object-curly-spacing
      '@stylistic/object-curly-spacing': ['error', 'always'],

      // enforce "same line" or "multiple line" on object properties.
      // https://eslint.style/rules/default/object-property-newline
      '@stylistic/object-property-newline': ['error', {
        allowAllPropertiesOnSameLine: true,
      }],

      // require a newline around variable declaration
      // https://eslint.style/rules/default/one-var-declaration-per-line
      '@stylistic/one-var-declaration-per-line': ['error', 'always'],

      // Requires operator at the beginning of the line in multiline statements
      // https://eslint.style/rules/default/operator-linebreak
      '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'none' } }],

      // disallow padding within blocks
      // https://eslint.style/rules/default/padded-blocks
      '@stylistic/padded-blocks': ['error', 'never', {
        allowSingleLineBlocks: true,
      }],

      // Require or disallow padding lines between statements
      // https://eslint.style/rules/default/padding-line-between-statements
      '@stylistic/padding-line-between-statements': [
        2,
        // Always require blank lines after directive (like 'use-strict'), except between directives
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
        // Always require blank lines after import, except between imports
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        // Always require blank lines before and after every sequence of variable declarations and export
        { blankLine: 'always', prev: '*', next: ['const', 'let', 'var', 'export'] },
        { blankLine: 'always', prev: ['const', 'let', 'var', 'export'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var', 'export'],
          next: ['const', 'let', 'var', 'export'],
        },
        // Always require blank lines before and after class declaration, if, do/while, switch, try
        {
          blankLine: 'always',
          prev: '*',
          next: ['if', 'class', 'for', 'do', 'while', 'switch', 'try'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'class', 'for', 'do', 'while', 'switch', 'try'],
          next: '*',
        },
        // But don't require blank lines before break statements
        { blankLine: 'any', prev: '*', next: 'break' },
        // Don't require blank lines before return statements
        { blankLine: 'any', prev: '*', next: 'return' },
      ],

      // require quotes around object literal property names
      // https://eslint.style/rules/default/quote-props
      '@stylistic/quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true, numbers: false }],

      // specify whether double or single quotes should be used
      // https://eslint.style/rules/default/quotes
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

      // do not allow spaces between rest/spread operators and their expressions
      // https://eslint.style/rules/default/rest-spread-spacing
      '@stylistic/rest-spread-spacing': ['error', 'never'],

      // require or disallow use of semicolons instead of ASI
      // https://eslint.style/rules/default/semi
      '@stylistic/semi': ['error', 'always'],

      // enforce spacing before and after semicolons
      // https://eslint.style/rules/default/semi-spacing
      '@stylistic/semi-spacing': ['error', { before: false, after: true }],

      // Enforce location of semicolons
      // https://eslint.style/rules/default/semi-style
      '@stylistic/semi-style': ['error', 'last'],

      // require space before blocks
      // https://eslint.style/rules/default/space-before-blocks
      '@stylistic/space-before-blocks': ['error', 'always'],

      // disallow space before function opening parenthesis
      // https://eslint.style/rules/default/space-before-function-paren
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],

      // disallow spaces inside parentheses
      // https://eslint.style/rules/default/space-in-parens
      '@stylistic/space-in-parens': ['error', 'never'],

      // require spaces around operators
      '@stylistic/space-infix-ops': 'error',

      // Require or disallow spaces before/after unary operators
      // https://eslint.style/rules/default/space-unary-ops
      '@stylistic/space-unary-ops': ['error', {
        words: true,
        nonwords: false,
        overrides: {},
      }],

      // require or disallow a space immediately following the // or /* in a comment
      // https://eslint.style/rules/default/spaced-comment
      '@stylistic/spaced-comment': ['error', 'always', {
        line: {
          exceptions: ['-', '+'],
          markers: ['=', '!', '/'], // space here to support sprockets directives, slash for TS /// comments
        },
        block: {
          exceptions: ['-', '+'],
          markers: ['=', '!', ':', '::'], // space here to support sprockets directives and flow comment types
          balanced: true,
        }
      }],

      // Enforce spacing around colons of switch statements
      // https://eslint.style/rules/default/switch-colon-spacing
      '@stylistic/switch-colon-spacing': ['error', { after: true, before: false }],

      // Enforce spacing around embedded expressions of template strings
      // https://eslint.style/rules/default/template-curly-spacing
      '@stylistic/template-curly-spacing': ['error', 'never'],

      // Require or disallow spacing between template tags and their literals
      // https://eslint.style/rules/default/template-tag-spacing
      '@stylistic/template-tag-spacing': ['error', 'never'],

      // Enforce spacing around type annotations
      // https://eslint.style/rules/default/type-annotation-spacing
      '@stylistic/type-annotation-spacing': ['error', {
        before: false,
        after: true,
        overrides: {
          arrow: { before: true, after: true },
        },
      }],

      // Enforce consistent spacing around generics
      // https://eslint.style/rules/default/type-generic-spacing
      '@stylistic/type-generic-spacing': 'error',

      // Expect a space before the type declaration in the named tuple
      // https://eslint.style/rules/default/type-named-tuple-spacing
      '@stylistic/type-named-tuple-spacing': 'error',

      // Enforce consistent wrapping of IIFEs
      // https://eslint.style/rules/default/wrap-iife
      '@stylistic/wrap-iife': ['error', 'outside', { functionPrototypeMethods: false }],

      // require regex literals to be wrapped in parentheses
      // https://eslint.style/rules/default/wrap-regex
      '@stylistic/wrap-regex': 'off',

      // Enforce spacing around the * in yield* expressions
      // https://eslint.style/rules/default/yield-star-spacing
      '@stylistic/yield-star-spacing': ['error', { before: true, after: false }],
    },
  },
];
