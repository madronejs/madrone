const decorators = require('@babel/plugin-proposal-decorators');

module.exports = { presets: ['@babel/preset-env'], plugins: [[decorators, { legacy: true }]] };
