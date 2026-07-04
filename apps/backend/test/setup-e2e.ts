/**
 * Runs before any module (incl. AppModule/PrismaClient) is imported, so the
 * override lands in process.env in time for Prisma to pick it up.
 *
 * Points the suite at a dedicated test database — NEVER the dev/prod DB.
 * Override with TEST_DATABASE_URL in CI. The schema must already be migrated
 * (`DATABASE_URL=… npx prisma migrate deploy`).
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://rental:change_me_in_production@localhost:5432/rental_test';
process.env.NODE_ENV = 'test';
