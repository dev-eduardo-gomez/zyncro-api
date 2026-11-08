import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { AppModule } from '../src/app.module.js';
import {
  assertMatchesContract,
  cobrixContract,
} from './contract/openapi-contract.js';

if (existsSync('.env')) process.loadEnvFile();

// The contract and the guards must agree: every operation the contract
// protects (it inherits the global bearerAuth or declares its own) has to
// reject a request without a valid token, and declare that 401.
const protectedOperations = cobrixContract
  .operations()
  .filter((operation) => operation.requiresAuth);

// The other direction: an operation the contract declares public
// (`security: []`) must not be blocked by the guard.
const publicOperations = cobrixContract
  .operations()
  .filter((operation) => !operation.requiresAuth);

// Path parameters only need a well-formed value: the guard runs before any
// lookup, so the resource does not have to exist.
const PATH_PARAMETER_VALUE = '8f14e45f-ceea-467f-a0e6-1b3c4d5e6f70';
const toUrl = (path: string) =>
  path.replaceAll(/\{[^}]+\}/g, PATH_PARAMETER_VALUE);

describe('Contract security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('finds protected operations in the contract', () => {
    expect(protectedOperations.length).toBeGreaterThan(0);
  });

  describe.each(protectedOperations)('$method $path', ({ method, path }) => {
    it('rejects a request without a token with 401', async () => {
      const response = await request(app.getHttpServer())[method](toUrl(path));

      expect(response.status).toBe(401);
      assertMatchesContract(method, path, response);
    });

    it('rejects an invalid token with 401', async () => {
      const response = await request(app.getHttpServer())
        [method](toUrl(path))
        .set('Authorization', 'Bearer not-a-real-token');

      expect(response.status).toBe(401);
      assertMatchesContract(method, path, response);
    });
  });

  it('finds public operations in the contract', () => {
    expect(publicOperations.length).toBeGreaterThan(0);
  });

  describe.each(publicOperations)('$method $path', ({ method, path }) => {
    it('lets a request without a token past the guard', async () => {
      const response = await request(app.getHttpServer())[method](toUrl(path));

      expect(response.status).not.toBe(401);
      assertMatchesContract(method, path, response);
    });
  });
});
