import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/ports/access-token-issuer.js';
import { Roles } from '../src/auth/infrastructure/security/roles.decorator.js';
import { Role } from '../src/auth/domain/models/role.js';

if (existsSync('.env')) process.loadEnvFile();

const PROBLEM_JSON = /^application\/problem\+json/;

@Controller('e2e-probe')
class AdminOnlyController {
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }

  @Roles(Role.CHECKER, Role.ADMIN)
  @Get('checker-or-admin')
  checkerOrAdmin() {
    return { ok: true };
  }
}

describe('Protected routes (e2e)', () => {
  let app: INestApplication;
  let issuer: AccessTokenIssuer;

  const tokenFor = (role: Role) =>
    issuer.issue({ sub: 'user-1', email: 'user@zyncro.test', role })
      .accessToken;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdminOnlyController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    issuer = app.get(AccessTokenIssuer);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /auth/me', () => {
    it('rejects a request without a token with 401', async () => {
      const response = await request(app.getHttpServer()).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    });

    it('rejects an invalid token with 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token');

      expect(response.status).toBe(401);
    });

    it('returns the authenticated user for a valid token, with no password field', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenFor(Role.CHECKER)}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'user-1',
        email: 'user@zyncro.test',
        role: 'CHECKER',
      });
    });
  });

  describe('@Roles() guard', () => {
    it('rejects a token with the wrong role with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/e2e-probe/admin-only')
        .set('Authorization', `Bearer ${tokenFor(Role.MAKER)}`);

      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    });

    it('lets the right role through', async () => {
      const response = await request(app.getHttpServer())
        .get('/e2e-probe/admin-only')
        .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it.each([Role.CHECKER, Role.ADMIN])(
      'lets %s through a route that allows several roles',
      async (role) => {
        const response = await request(app.getHttpServer())
          .get('/e2e-probe/checker-or-admin')
          .set('Authorization', `Bearer ${tokenFor(role)}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
      },
    );

    it('rejects a role outside the allowed list with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/e2e-probe/checker-or-admin')
        .set('Authorization', `Bearer ${tokenFor(Role.MAKER)}`);

      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    });
  });
});
