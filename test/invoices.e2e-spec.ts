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
const TAX_ID_PREFIX = `TEST-INV-${Date.now()}`;
const DAY_MS = 86_400_000;

const subscriptionLine = {
  description: 'Monthly subscription',
  quantity: 1,
  unitPrice: '1000.00',
  taxRate: 0.16,
};

const setupLine = {
  description: 'Setup fee',
  quantity: 1.5,
  unitPrice: '33.33',
  taxRate: 0,
};

const daysFromTodayUtc = (date: string) =>
  (Date.parse(date) - Date.parse(new Date().toISOString().slice(0, 10))) /
  DAY_MS;

describe('Invoices (e2e)', () => {
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
    await prisma.invoice.deleteMany({
      where: { customer: { taxId: { startsWith: TAX_ID_PREFIX } } },
    });
    await prisma.customer.deleteMany({
      where: { taxId: { startsWith: TAX_ID_PREFIX } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  const authed = (method: 'get' | 'post', path: string) =>
    request(app.getHttpServer())[method](path).set(
      'Authorization',
      `Bearer ${token}`,
    );

  const createCustomer = async (suffix: string, creditDays: number) => {
    const response = await authed('post', '/customers').send({
      taxId: `${TAX_ID_PREFIX}-${suffix}`,
      legalName: 'Acme Corp',
      address: 'Av. Siempre Viva 123, CDMX',
      contactEmail: `billing-${suffix}@acme.test`,
      creditDays,
    });
    return response.body.id as string;
  };

  it('creates an invoice with server-computed amounts and due date', async () => {
    const customerId = await createCustomer('create', 30);

    const response = await authed('post', '/invoices').send({
      customerId,
      currency: 'MXN',
      lineItems: [subscriptionLine, setupLine],
    });

    assertMatchesContract('post', '/invoices', response);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      customerId,
      currency: 'MXN',
      lineItems: [
        { ...subscriptionLine, lineTotal: '1000.00' },
        { ...setupLine, lineTotal: '50.00' },
      ],
      subtotal: '1050.00',
      tax: '160.00',
      total: '1210.00',
      balance: '1210.00',
      status: 'PENDING',
      derivedStatus: null,
    });
    expect(daysFromTodayUtc(response.body.dueDate)).toBe(30);
  });

  it('keeps the largest supported amount exact from request to response', async () => {
    const customerId = await createCustomer('precision', 30);

    const response = await authed('post', '/invoices').send({
      customerId,
      currency: 'MXN',
      lineItems: [
        {
          description: 'Capital equipment',
          quantity: 1,
          unitPrice: '9999999999999.99',
          taxRate: 0,
        },
      ],
    });

    assertMatchesContract('post', '/invoices', response);
    expect(response.status).toBe(201);
    expect(response.body.total).toBe('9999999999999.99');
  });

  it('marks an invoice DUE_SOON when its due date falls inside the reminder window', async () => {
    const customerId = await createCustomer('due-soon', 3);

    const response = await authed('post', '/invoices').send({
      customerId,
      currency: 'MXN',
      lineItems: [subscriptionLine],
    });

    assertMatchesContract('post', '/invoices', response);
    expect(response.status).toBe(201);
    expect(response.body.derivedStatus).toBe('DUE_SOON');
  });

  it('assigns a distinct folio to each of 10 concurrent invoices', async () => {
    const customerId = await createCustomer('concurrent', 30);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        authed('post', '/invoices').send({
          customerId,
          currency: 'MXN',
          lineItems: [subscriptionLine],
        }),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual(
      Array(10).fill(201),
    );
    const folios = responses.map((response) => response.body.folio);
    expect(new Set(folios).size).toBe(10);
  });

  it('answers 404 when the customer does not exist', async () => {
    const response = await authed('post', '/invoices').send({
      customerId: randomUUID(),
      currency: 'MXN',
      lineItems: [subscriptionLine],
    });

    assertMatchesContract('post', '/invoices', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it.each([
    ['no line items', { lineItems: [] }, 'lineItems'],
    [
      'a unit price sent as a JSON number',
      { lineItems: [{ ...subscriptionLine, unitPrice: 1000 }] },
      'lineItems.0.unitPrice',
    ],
    [
      'a quantity with more than 4 decimals',
      { lineItems: [{ ...subscriptionLine, quantity: 1.00001 }] },
      'lineItems.0.quantity',
    ],
    [
      'a tax rate above 1',
      { lineItems: [{ ...subscriptionLine, taxRate: 16 }] },
      'lineItems.0.taxRate',
    ],
  ])('answers 400 for %s', async (_case, override, field) => {
    const response = await authed('post', '/invoices').send({
      customerId: randomUUID(),
      currency: 'MXN',
      ...override,
    });

    assertMatchesContract('post', '/invoices', response);
    expect(response.status).toBe(400);
    expect(
      response.body.errors.map((error: { field: string }) => error.field),
    ).toContain(field);
  });

  it('gets an invoice by id', async () => {
    const customerId = await createCustomer('get-by-id', 30);
    const created = await authed('post', '/invoices').send({
      customerId,
      currency: 'MXN',
      lineItems: [subscriptionLine, setupLine],
    });

    const response = await authed('get', `/invoices/${created.body.id}`);

    assertMatchesContract('get', '/invoices/{invoiceId}', response);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(created.body);
  });

  it('answers 404 for an unknown invoice id', async () => {
    const response = await authed('get', `/invoices/${randomUUID()}`);

    assertMatchesContract('get', '/invoices/{invoiceId}', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });
});
