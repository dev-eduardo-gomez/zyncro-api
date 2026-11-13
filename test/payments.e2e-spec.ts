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
const TAX_ID_PREFIX = `TEST-PAY-${Date.now()}`;

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;
  let sequence = 0;

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
    const owned = { customer: { taxId: { startsWith: TAX_ID_PREFIX } } };
    await prisma.payment.deleteMany({ where: { invoice: owned } });
    await prisma.invoice.deleteMany({ where: owned });
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

  const createInvoice = async () => {
    sequence += 1;
    const customer = await authed('post', '/customers').send({
      taxId: `${TAX_ID_PREFIX}-${sequence}`,
      legalName: 'Acme Corp',
      address: 'Av. Siempre Viva 123, CDMX',
      contactEmail: `billing-${sequence}@acme.test`,
      creditDays: 30,
    });
    const invoice = await authed('post', '/invoices').send({
      customerId: customer.body.id,
      currency: 'MXN',
      lineItems: [
        {
          description: 'Monthly subscription',
          quantity: 1,
          unitPrice: '1000.00',
          taxRate: 0.16,
        },
      ],
    });
    return {
      invoiceId: invoice.body.id as string,
      customerId: customer.body.id as string,
    };
  };

  const pay = (invoiceId: string, body: object) =>
    authed('post', `/invoices/${invoiceId}/payments`).send(body);

  it('registers a partial payment and leaves the invoice PARTIAL', async () => {
    const { invoiceId } = await createInvoice();

    const response = await pay(invoiceId, {
      amount: '400.00',
      proofUrl: 'https://proofs.test/transfer-1.pdf',
    });

    assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      invoiceId,
      amount: '400.00',
      appliedAmount: '400.00',
      creditAmount: '0.00',
      proofUrl: 'https://proofs.test/transfer-1.pdf',
      createdAt: expect.any(String),
    });

    const invoice = await authed('get', `/invoices/${invoiceId}`);
    expect(invoice.body).toMatchObject({
      balance: '760.00',
      status: 'PENDING',
      derivedStatus: 'PARTIAL',
    });
  });

  it('marks the invoice PAID when a payment completes the total (R4)', async () => {
    const { invoiceId } = await createInvoice();

    await pay(invoiceId, { amount: '1160.00' });

    const invoice = await authed('get', `/invoices/${invoiceId}`);
    assertMatchesContract('get', '/invoices/{invoiceId}', invoice);
    expect(invoice.body).toMatchObject({
      balance: '0.00',
      status: 'PAID',
      derivedStatus: null,
    });
  });

  it("turns an overpayment's excess into customer credit (R5)", async () => {
    const { invoiceId, customerId } = await createInvoice();

    const response = await pay(invoiceId, { amount: '1400.00' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      amount: '1400.00',
      appliedAmount: '1160.00',
      creditAmount: '240.00',
      proofUrl: null,
    });
    const customer = await authed('get', `/customers/${customerId}`);
    expect(customer.body.creditBalance).toBe('240.00');
  });

  it('accepts a payment on a PAID invoice entirely as credit', async () => {
    const { invoiceId, customerId } = await createInvoice();
    await pay(invoiceId, { amount: '1160.00' });

    const response = await pay(invoiceId, { amount: '50.00' });

    assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      appliedAmount: '0.00',
      creditAmount: '50.00',
    });
    const customer = await authed('get', `/customers/${customerId}`);
    expect(customer.body.creditBalance).toBe('50.00');
  });

  it('rejects a payment on a CANCELLED invoice with 409 and stores nothing (R4)', async () => {
    const { invoiceId } = await createInvoice();
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });

    const response = await pay(invoiceId, { amount: '100.00' });

    assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(409);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.type).toBe(
      'https://cobrix.io/errors/business-rule/invoice-cancelled',
    );
    expect(await prisma.payment.count({ where: { invoiceId } })).toBe(0);
  });

  it('answers 404 when paying an unknown invoice', async () => {
    const response = await pay(randomUUID(), { amount: '100.00' });

    assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });

  it.each([
    ['a zero amount', { amount: '0.00' }],
    ['an amount sent as a JSON number', { amount: 100 }],
    ['an amount with more than 2 decimals', { amount: '10.005' }],
    ['a proofUrl that is not a URL', { amount: '10.00', proofUrl: 'nope' }],
  ])('answers 400 for %s', async (_case, body) => {
    const { invoiceId } = await createInvoice();

    const response = await pay(invoiceId, body);

    assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(400);
    expect(await prisma.payment.count({ where: { invoiceId } })).toBe(0);
  });

  it("lists an invoice's payments oldest first", async () => {
    const { invoiceId } = await createInvoice();
    await pay(invoiceId, { amount: '100.00' });
    await pay(invoiceId, { amount: '200.00' });

    const response = await authed('get', `/invoices/${invoiceId}/payments`);

    assertMatchesContract('get', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(200);
    expect(
      response.body.map((payment: { amount: string }) => payment.amount),
    ).toEqual(['100.00', '200.00']);
  });

  it('answers 404 when listing payments of an unknown invoice', async () => {
    const response = await authed('get', `/invoices/${randomUUID()}/payments`);

    assertMatchesContract('get', '/invoices/{invoiceId}/payments', response);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
  });
});
