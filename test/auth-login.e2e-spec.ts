import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { Argon2PasswordHasher } from '../src/auth/infrastructure/security/argon2-password-hasher.js';

if (existsSync('.env')) process.loadEnvFile();

const PROBLEM_JSON = /^application\/problem\+json/;

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const hasher = new Argon2PasswordHasher();
  const email = `test-${Date.now()}-login@users.int`;
  const password = 'Sup3rSecret!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    await prisma.user.create({
      data: { email, passwordHash: await hasher.hash(password) },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    await app.close();
  });

  it('logs in with the right credentials and returns a Bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(0);
    expect(response.body.expiresIn).toBeGreaterThan(0);

    const [, payloadSegment] = response.body.accessToken.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    );
    expect(payload).toMatchObject({ email, role: 'MAKER' });
    expect(typeof payload.sub).toBe('string');
  });

  it('rejects an unknown email with 401 and a generic detail', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'does-not-exist@users.int', password });

    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.detail).toBe('Invalid email or password.');
  });

  it('rejects the wrong password with the same generic detail', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.detail).toBe('Invalid email or password.');
  });

  it('answers an invalid body with a validation Problem Details', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { field: 'email', detail: 'email must be an email' },
      { field: 'password', detail: 'password should not be empty' },
    ]);
  });
});
