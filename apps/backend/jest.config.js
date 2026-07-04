/**
 * Jest config for backend unit tests.
 *
 * Scope: fast, isolated unit tests of pure logic and services with mocked
 * dependencies (no live Postgres/Redis/S3). Run with `npm test`.
 * End-to-end tests (live infra) live under ./test and use jest-e2e.json.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!**/main.ts', '!**/*.dto.ts'],
  coverageDirectory: '../coverage',
  // Decorator metadata needs the project tsconfig; ts-jest reads it by default.
};
