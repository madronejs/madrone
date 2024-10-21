import { default as bestPractices } from './best-practices.js';
import { default as errors } from './errors.js';
import { default as es6 } from './es6.js';
import { default as imports } from './imports.js';
import { default as node } from './node.js';
import { default as strict } from './strict.js';
import { default as style } from './style.js';
import { default as variables } from './variables.js';

const airbnbAll = Object.assign({},
  bestPractices.rules,
  errors.rules,
  es6.rules,
  // imports.rules,
  node.rules,
  strict.rules,
  style.rules,
  variables.rules,
);

export default airbnbAll;
