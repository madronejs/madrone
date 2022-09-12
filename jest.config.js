module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: [`<rootDir>/src/**/?(*.)spec.(j|t)s`],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/src/$1',
  },
};
