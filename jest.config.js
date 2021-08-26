module.exports = {
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/node_modules/regenerator-runtime/runtime'],
  testMatch: [`<rootDir>/src/**/?(*.)spec.js`],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
