import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile();

const PROBLEM_JSON = /^application\/problem\+json/;

// The contract (contracts/openapi.yaml) is the source of truth: a route that
// is not in it must not exist. GET / was the Nest scaffold's placeholder.
describe('Root route (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('does not expose the scaffold placeholder at GET /', async () => {
    const response = await request(app.getHttpServer()).get('/');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/',
    });
  });
});
