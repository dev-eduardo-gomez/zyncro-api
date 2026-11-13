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
const TAX_ID_PREFIX = `TEST-LIST-${Date.now()}`;
const DAY_MS = 86_400_000;

const line = (unitPrice: string) => ({
  description: 'Monthly subscription',
  quantity: 1,
  unitPrice,
  taxRate: 0.16,
});

const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);

const cursorFor = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

describe('Invoice listing (e2e)', () => {
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
    await prisma.payment.deleteMany({
      where: {
        invoice: { customer: { taxId: { startsWith: TAX_ID_PREFIX } } },
      },
    });
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
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  const list = (query: Record<string, string | number>) =>
    authed('get', '/invoices').query(query);

  const createCustomer = async (suffix: string) => {
    const response = await authed('post', '/customers').send({
      taxId: `${TAX_ID_PREFIX}-${suffix}`,
      legalName: 'Acme Corp',
      address: 'Av. Siempre Viva 123, CDMX',
      contactEmail: `billing-${suffix}@acme.test`,
      creditDays: 30,
    });
    return response.body.id as string;
  };

  const createInvoice = async (customerId: string, unitPrice = '1000.00') => {
    const response = await authed('post', '/invoices').send({
      customerId,
      currency: 'MXN',
      lineItems: [line(unitPrice)],
    });
    return response.body as { id: string; dueDate: string; total: string };
  };

  const ids = (response: request.Response) =>
    response.body.items.map((item: { id: string }) => item.id);

  it('lists invoices newest first, in the same shape as GET /invoices/{id}', async () => {
    const customerId = await createCustomer('shape');
    const older = await createInvoice(customerId);
    const newer = await createInvoice(customerId);

    const response = await list({ customerId });

    assertMatchesContract('get', '/invoices', response);
    expect(response.status).toBe(200);
    expect(ids(response)).toEqual([newer.id, older.id]);
    expect(response.body.nextCursor).toBeNull();
    const single = await authed('get', `/invoices/${newer.id}`);
    expect(response.body.items[0]).toEqual(single.body);
  });

  it('returns 20 invoices per page when no limit is given', async () => {
    const customerId = await createCustomer('default-limit');
    for (let index = 0; index < 21; index += 1) {
      await createInvoice(customerId);
    }

    const response = await list({ customerId });

    assertMatchesContract('get', '/invoices', response);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(20);
    expect(response.body.nextCursor).toEqual(expect.any(String));
  });

  it('walks every page with the cursor without repeating or skipping invoices', async () => {
    const customerId = await createCustomer('walk');
    const created = [];
    for (let index = 0; index < 5; index += 1) {
      created.push((await createInvoice(customerId)).id);
    }

    const first = await list({ customerId, limit: 2 });
    const second = await list({
      customerId,
      limit: 2,
      cursor: first.body.nextCursor,
    });
    const third = await list({
      customerId,
      limit: 2,
      cursor: second.body.nextCursor,
    });

    for (const page of [first, second, third]) {
      assertMatchesContract('get', '/invoices', page);
      expect(page.status).toBe(200);
    }
    expect([...ids(first), ...ids(second), ...ids(third)]).toEqual(
      [...created].reverse(),
    );
    expect(third.body.nextCursor).toBeNull();
  });

  it('keeps the next page stable when an invoice is created between pages (R8)', async () => {
    const customerId = await createCustomer('stable');
    const created = [];
    for (let index = 0; index < 4; index += 1) {
      created.push((await createInvoice(customerId)).id);
    }

    const first = await list({ customerId, limit: 2 });
    const inserted = await createInvoice(customerId);
    const second = await list({
      customerId,
      limit: 2,
      cursor: first.body.nextCursor,
    });

    expect(ids(first)).toEqual([created[3], created[2]]);
    expect(ids(second)).toEqual([created[1], created[0]]);
    expect(ids(second)).not.toContain(inserted.id);
    expect(second.body.nextCursor).toBeNull();
  });

  describe('filters', () => {
    let customerId: string;
    let dueDate: string;
    let big: string;
    let small: string;
    let paid: string;

    beforeAll(async () => {
      customerId = await createCustomer('filters');
      const bigInvoice = await createInvoice(customerId, '1000.00');
      const smallInvoice = await createInvoice(customerId, '100.00');
      const paidInvoice = await createInvoice(customerId, '1000.00');
      await authed('post', `/invoices/${paidInvoice.id}/payments`).send({
        amount: paidInvoice.total,
      });
      big = bigInvoice.id;
      small = smallInvoice.id;
      paid = paidInvoice.id;
      dueDate = bigInvoice.dueDate;
    });

    it.each([
      ['status', () => ({ status: 'PAID' }), () => [paid]],
      ['minAmount', () => ({ minAmount: '1160.00' }), () => [paid, big]],
      ['maxAmount', () => ({ maxAmount: '116.00' }), () => [small]],
      ['dueDateFrom', () => ({ dueDateFrom: shiftDate(dueDate, 1) }), () => []],
      ['dueDateTo', () => ({ dueDateTo: shiftDate(dueDate, -1) }), () => []],
      [
        'a closed due date range',
        () => ({ dueDateFrom: dueDate, dueDateTo: dueDate }),
        () => [paid, small, big],
      ],
      [
        'every filter at once',
        () => ({
          status: 'PENDING',
          minAmount: '1000.00',
          maxAmount: '2000.00',
          dueDateFrom: dueDate,
          dueDateTo: dueDate,
        }),
        () => [big],
      ],
    ])('applies %s', async (_case, filter, expected) => {
      const response = await list({ customerId, ...filter() });

      assertMatchesContract('get', '/invoices', response);
      expect(response.status).toBe(200);
      expect(ids(response)).toEqual(expected());
    });
  });

  it.each([
    ['a limit of 0', { limit: 0 }, 'limit'],
    ['a limit over 100', { limit: 101 }, 'limit'],
    ['a fractional limit', { limit: '1.5' }, 'limit'],
    ['a non-numeric limit', { limit: 'abc' }, 'limit'],
    ['a cursor that was never issued', { cursor: 'not-a-cursor' }, 'cursor'],
    [
      'a cursor with a negative folio',
      { cursor: cursorFor({ folio: -1 }) },
      'cursor',
    ],
    ['an unknown status', { status: 'OPEN' }, 'status'],
    [
      'a customerId that is not a UUID',
      { customerId: 'customer-1' },
      'customerId',
    ],
    [
      'a dueDateFrom that is not a date',
      { dueDateFrom: '2026-13-01' },
      'dueDateFrom',
    ],
    [
      'a dueDateTo with a time',
      { dueDateTo: '2026-11-01T00:00:00Z' },
      'dueDateTo',
    ],
    ['a minAmount without cents', { minAmount: '10' }, 'minAmount'],
    ['a non-numeric maxAmount', { maxAmount: 'abc' }, 'maxAmount'],
    ['an unknown query parameter', { page: 2 }, 'page'],
  ])('answers 400 for %s', async (_case, query, field) => {
    const response = await list(query);

    assertMatchesContract('get', '/invoices', response);
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(
      response.body.errors.map((error: { field: string }) => error.field),
    ).toContain(field);
  });
});
