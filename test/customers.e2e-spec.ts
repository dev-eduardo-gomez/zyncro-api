import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/ports/access-token-issuer.js';
import { Role } from '../src/auth/domain/models/role.js';
import { assertMatchesContract } from './contract/openapi-contract.js';

if (existsSync('.env')) process.loadEnvFile();

const PROBLEM_JSON = /^application\/problem\+json/;
const TAX_ID_PREFIX = `TEST-${Date.now()}`;

const validCustomer = (suffix: string) => ({
  taxId: `${TAX_ID_PREFIX}-${suffix}`,
  legalName: 'Acme Corp',
  address: 'Av. Siempre Viva 123, CDMX',
  contactEmail: `billing-${suffix}@acme.test`,
  creditDays: 30,
});

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const issuer = app.get(AccessTokenIssuer);
    token = issuer.issue({
      sub: randomUUID(),
      email: 'user@zyncro.test',
      role: Role.MAKER,
    }).accessToken;

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({
      where: { taxId: { startsWith: TAX_ID_PREFIX } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  const authed = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    );

  it('rejects a request without a token with 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/customers')
      .send(validCustomer('no-token'));

    assertMatchesContract('post', '/customers', response);
    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it('creates a customer and returns it with a zero credit balance', async () => {
    const response = await authed('post', '/customers').send(
      validCustomer('create'),
    );

    assertMatchesContract('post', '/customers', response);
    expect(response.status).toBe(201);
    expect(typeof response.body.id).toBe('string');
    expect(response.body).toMatchObject({
      taxId: `${TAX_ID_PREFIX}-create`,
      legalName: 'Acme Corp',
      address: 'Av. Siempre Viva 123, CDMX',
      contactEmail: 'billing-create@acme.test',
      creditDays: 30,
      creditBalance: '0.00',
    });
  });

  it('rejects a duplicate taxId with 409', async () => {
    await authed('post', '/customers').send(validCustomer('duplicate'));

    const response = await authed('post', '/customers').send(
      validCustomer('duplicate'),
    );

    assertMatchesContract('post', '/customers', response);
    expect(response.status).toBe(409);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.type).toBe(
      'https://cobrix.io/errors/business-rule/customer-duplicate-tax-id',
    );
  });

  it('answers an invalid body with a validation Problem Details', async () => {
    const response = await authed('post', '/customers').send({
      ...validCustomer('invalid'),
      contactEmail: 'not-an-email',
    });

    assertMatchesContract('post', '/customers', response);
    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { field: 'contactEmail', detail: 'contactEmail must be an email' },
    ]);
  });

  it('gets a customer by id', async () => {
    const created = await authed('post', '/customers').send(
      validCustomer('get-by-id'),
    );

    const response = await authed('get', `/customers/${created.body.id}`);

    assertMatchesContract('get', '/customers/{customerId}', response);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(created.body);
  });

  it('answers 404 for an unknown customer id', async () => {
    const response = await authed('get', `/customers/${randomUUID()}`);

    assertMatchesContract('get', '/customers/{customerId}', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it('lists customers including a newly created one', async () => {
    const created = await authed('post', '/customers').send(
      validCustomer('list'),
    );

    const response = await authed('get', '/customers');

    assertMatchesContract('get', '/customers', response);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );
  });

  it("updates a customer's editable fields, leaving taxId untouched", async () => {
    const created = await authed('post', '/customers').send(
      validCustomer('update'),
    );

    const response = await authed(
      'patch',
      `/customers/${created.body.id}`,
    ).send({ legalName: 'Acme Corp Renamed', creditDays: 45 });

    assertMatchesContract('patch', '/customers/{customerId}', response);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      taxId: created.body.taxId,
      legalName: 'Acme Corp Renamed',
      creditDays: 45,
    });
  });

  it('answers 404 when patching an unknown customer id', async () => {
    const response = await authed(
      'patch',
      `/customers/${randomUUID()}`,
    ).send({ legalName: 'Nobody' });

    assertMatchesContract('patch', '/customers/{customerId}', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });
});
