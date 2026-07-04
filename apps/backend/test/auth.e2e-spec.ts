import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createTestApp } from './utils/create-app';

// esModuleInterop is off in this repo — `export =` CJS modules need import-require.
import request = require('supertest');

/** Unique email per call so tests don't collide across runs on the shared DB. */
const uniqueEmail = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

const register = (app: INestApplication, over: Record<string, unknown> = {}) =>
  request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      orgName: 'E2E Org',
      email: uniqueEmail(),
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      ...over,
    });

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates an org + OWNER, returns tokens and a sanitized user', async () => {
      const res = await register(app).expect(201);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({ role: 'OWNER' });
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email with 409', async () => {
      const email = uniqueEmail();
      await register(app, { email }).expect(201);
      await register(app, { email }).expect(409);
    });

    it('rejects a too-short password with 400 (validation)', async () => {
      await register(app, { password: 'short' }).expect(400);
    });

    it('rejects unknown fields with 400 (whitelist/forbidNonWhitelisted)', async () => {
      await register(app, { hacker: true }).expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials and rejects a wrong password with AUTH_001', async () => {
      const email = uniqueEmail();
      await register(app, { email }).expect(201);

      const ok = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'password123' })
        .expect(200);
      expect(ok.body.data.accessToken).toEqual(expect.any(String));

      const bad = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WRONGPASS' })
        .expect(401);
      expect(bad.body.error.code).toBe('AUTH_001');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the profile with a valid token', async () => {
      const reg = await register(app).expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.data.accessToken}`)
        .expect(200);
      expect(res.body.data).toMatchObject({ role: 'OWNER' });
    });

    it('rejects a missing token with 401', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('rejects a garbage token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh — rotation & reuse detection', () => {
    it('rotates the refresh token and revokes the whole family on reuse', async () => {
      const reg = await register(app).expect(201);
      const r1 = reg.body.data.refreshToken;

      // First refresh succeeds and rotates R1 → R2.
      const rot = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: r1 })
        .expect(200);
      const r2 = rot.body.data.refreshToken;
      expect(r2).toEqual(expect.any(String));
      expect(r2).not.toBe(r1);

      // Reusing the now-rotated R1 is detected → 401 AUTH_005.
      const reuse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: r1 })
        .expect(401);
      expect(reuse.body.error.code).toBe('AUTH_005');

      // Reuse nuked the family, so R2 is now dead too.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: r2 })
        .expect(401);
    });

    it('rejects a structurally invalid refresh token with AUTH_004', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'garbage' })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_004');
    });
  });

  describe('RBAC enforcement (global PermissionsGuard)', () => {
    it('a MANAGER token is denied apartments:create with 403 AUTHZ_002', async () => {
      const reg = await register(app).expect(201);
      const owner = reg.body.data.user;

      // Forge a MANAGER token for the same org, signed with the real access secret.
      const jwt = app.get(JwtService);
      const managerToken = jwt.sign({
        sub: owner.id,
        email: owner.email,
        orgId: owner.orgId,
        role: 'MANAGER',
      });

      const res = await request(app.getHttpServer())
        .post('/api/apartments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ address: '1 Test St' })
        .expect(403);
      expect(res.body.error.code).toBe('AUTHZ_002');
    });

    it('the same request as OWNER passes the permission guard (not 403)', async () => {
      const reg = await register(app).expect(201);
      const res = await request(app.getHttpServer())
        .post('/api/apartments')
        .set('Authorization', `Bearer ${reg.body.data.accessToken}`)
        .send({ address: '1 Owner St' });
      expect(res.status).not.toBe(403);
      expect([200, 201]).toContain(res.status);
    });
  });
});
