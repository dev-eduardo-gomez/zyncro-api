import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { PrismaService } from '../../src/shared/infrastructure/persistence/prisma/prisma.service.js';
import { PrismaInvoiceRepository } from '../../src/invoices/infrastructure/persistence/prisma-invoice-repository.js';
import type {
  Invoice,
  InvoiceFilter,
  InvoicePage,
} from '../../src/invoices/domain/models/invoice.js';

if (existsSync('.env')) process.loadEnvFile();

describe('PrismaInvoiceRepository.findPage', () => {
  let prisma: PrismaService;
  let repository: PrismaInvoiceRepository;
  const taxIdPrefix = `INV-PAGE-INT-${Date.now()}`;
  let customerCount = 0;

  const createCustomer = async (): Promise<string> => {
    customerCount += 1;
    const customer = await prisma.customer.create({
      data: {
        taxId: `${taxIdPrefix}-${customerCount}`,
        legalName: 'Invoice Paging Int Corp',
        address: 'Av. Siempre Viva 123, CDMX',
        contactEmail: 'billing@invoice-paging.int',
        creditDays: 30,
      },
    });
    return customer.id;
  };

  const issue = (
    customerId: string,
    { total = '1000.00', dueDate = '2026-12-31' } = {},
  ): Promise<Invoice> =>
    repository.create({
      customerId,
      currency: 'MXN',
      lineItems: [
        {
          description: 'Service',
          quantity: 1,
          unitPrice: total,
          taxRate: 0,
          lineTotal: total,
        },
      ],
      subtotal: total,
      tax: '0.00',
      total,
      dueDate,
    });

  const issueMany = async (customerId: string, count: number) => {
    const invoices: Invoice[] = [];
    for (let i = 0; i < count; i += 1) invoices.push(await issue(customerId));
    return invoices;
  };

  const markPaid = (invoice: Invoice) =>
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID' },
    });

  const firstPage = (filter: InvoiceFilter, limit = 10) =>
    repository.findPage({ filter, afterFolio: null, limit });

  const folios = (page: InvoicePage) => page.items.map((item) => item.folio);
  const newestFirst = (invoices: Invoice[]) =>
    invoices.map((invoice) => invoice.folio).reverse();

  beforeAll(() => {
    prisma = new PrismaService();
    repository = new PrismaInvoiceRepository(prisma);
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({
      where: { customer: { taxId: { startsWith: taxIdPrefix } } },
    });
    await prisma.customer.deleteMany({
      where: { taxId: { startsWith: taxIdPrefix } },
    });
    await prisma.$disconnect();
  });

  describe('pages', () => {
    it('returns the matching invoices newest first, in the same shape as findById', async () => {
      const customerId = await createCustomer();
      const invoices = await issueMany(customerId, 3);

      const page = await firstPage({ customerId });

      expect(folios(page)).toEqual(newestFirst(invoices));
      expect(page.items[0]).toEqual(await repository.findById(invoices[2].id));
      expect(page.nextFolio).toBeNull();
    });

    it('returns nextFolio null when exactly `limit` invoices match', async () => {
      const customerId = await createCustomer();
      await issueMany(customerId, 3);

      const page = await firstPage({ customerId }, 3);

      expect(page.items).toHaveLength(3);
      expect(page.nextFolio).toBeNull();
    });

    it('returns `limit` invoices and the folio of the last one when more follow', async () => {
      const customerId = await createCustomer();
      const invoices = await issueMany(customerId, 5);

      const page = await firstPage({ customerId }, 2);

      expect(folios(page)).toEqual([invoices[4].folio, invoices[3].folio]);
      expect(page.nextFolio).toBe(invoices[3].folio);
    });

    it('continues after `afterFolio` and visits every invoice exactly once', async () => {
      const customerId = await createCustomer();
      const invoices = await issueMany(customerId, 5);

      const visited: number[] = [];
      let afterFolio: number | null = null;
      let pages = 0;
      do {
        const page: InvoicePage = await repository.findPage({
          filter: { customerId },
          afterFolio,
          limit: 2,
        });
        visited.push(...folios(page));
        afterFolio = page.nextFolio;
        pages += 1;
      } while (afterFolio !== null);

      expect(visited).toEqual(newestFirst(invoices));
      expect(pages).toBe(3);
    });

    it('neither repeats nor skips invoices when new ones are issued between pages (R8)', async () => {
      const customerId = await createCustomer();
      const invoices = await issueMany(customerId, 4);

      const page1 = await firstPage({ customerId }, 2);
      const issuedMeanwhile = await issue(customerId);
      const page2 = await repository.findPage({
        filter: { customerId },
        afterFolio: page1.nextFolio,
        limit: 2,
      });

      expect([...folios(page1), ...folios(page2)]).toEqual(
        newestFirst(invoices),
      );
      expect(folios(page2)).not.toContain(issuedMeanwhile.folio);
      expect(page2.nextFolio).toBeNull();
    });

    it('applies the filters before the limit, not to the page already cut', async () => {
      const customerId = await createCustomer();
      const invoices = await issueMany(customerId, 6);
      const paid = [invoices[0], invoices[2], invoices[4]];
      for (const invoice of paid) await markPaid(invoice);

      const page1 = await firstPage({ customerId, status: 'PAID' }, 2);
      const page2 = await repository.findPage({
        filter: { customerId, status: 'PAID' },
        afterFolio: page1.nextFolio,
        limit: 2,
      });

      expect(folios(page1)).toEqual([paid[2].folio, paid[1].folio]);
      expect(folios(page2)).toEqual([paid[0].folio]);
      expect(page2.nextFolio).toBeNull();
    });
  });

  describe('filters', () => {
    it('filters by customer', async () => {
      const customerA = await createCustomer();
      const customerB = await createCustomer();
      const ofA = await issue(customerA);
      await issue(customerB);

      const page = await firstPage({ customerId: customerA });

      expect(folios(page)).toEqual([ofA.folio]);
    });

    it('filters by persisted status', async () => {
      const customerId = await createCustomer();
      const pending = await issue(customerId);
      const paid = await issue(customerId);
      await markPaid(paid);

      const paidPage = await firstPage({ customerId, status: 'PAID' });
      const pendingPage = await firstPage({ customerId, status: 'PENDING' });

      expect(folios(paidPage)).toEqual([paid.folio]);
      expect(folios(pendingPage)).toEqual([pending.folio]);
    });

    it('includes both ends of the due date range', async () => {
      const customerId = await createCustomer();
      await issue(customerId, { dueDate: '2026-12-09' });
      const from = await issue(customerId, { dueDate: '2026-12-10' });
      const to = await issue(customerId, { dueDate: '2026-12-20' });
      await issue(customerId, { dueDate: '2026-12-21' });

      const page = await firstPage({
        customerId,
        dueDateFrom: '2026-12-10',
        dueDateTo: '2026-12-20',
      });

      expect(folios(page)).toEqual([to.folio, from.folio]);
    });

    it('accepts an open-ended due date range', async () => {
      const customerId = await createCustomer();
      await issue(customerId, { dueDate: '2026-12-09' });
      const later = await issue(customerId, { dueDate: '2026-12-10' });

      const page = await firstPage({ customerId, dueDateFrom: '2026-12-10' });

      expect(folios(page)).toEqual([later.folio]);
    });

    it('includes both ends of the total range and compares amounts as numbers, not text', async () => {
      const customerId = await createCustomer();
      await issue(customerId, { total: '99.99' });
      const min = await issue(customerId, { total: '100.00' });
      const middle = await issue(customerId, { total: '900.00' });
      const max = await issue(customerId, { total: '1000.00' });
      await issue(customerId, { total: '1000.01' });

      const page = await firstPage({
        customerId,
        minTotal: '100.00',
        maxTotal: '1000.00',
      });

      expect(folios(page)).toEqual([max.folio, middle.folio, min.folio]);
    });

    it('compares the amount range against total, not balance', async () => {
      const customerId = await createCustomer();
      const partiallyPaid = await issue(customerId, { total: '1000.00' });
      await prisma.invoice.update({
        where: { id: partiallyPaid.id },
        data: { balance: '100.00' },
      });

      const page = await firstPage({ customerId, minTotal: '500.00' });

      expect(folios(page)).toEqual([partiallyPaid.folio]);
    });

    it('combines every filter with AND', async () => {
      const customerId = await createCustomer();
      const otherCustomerId = await createCustomer();
      const match = { total: '500.00', dueDate: '2026-12-10' };

      const expected = await issue(customerId, match);
      await markPaid(expected);
      await issue(customerId, match);
      await markPaid(await issue(customerId, { ...match, dueDate: '2026-11-01' }));
      await markPaid(await issue(customerId, { ...match, total: '5000.00' }));
      await markPaid(await issue(otherCustomerId, match));

      const page = await firstPage({
        customerId,
        status: 'PAID',
        dueDateFrom: '2026-12-01',
        dueDateTo: '2026-12-31',
        minTotal: '100.00',
        maxTotal: '1000.00',
      });

      expect(folios(page)).toEqual([expected.folio]);
    });

    it('returns an empty page when nothing matches', async () => {
      const customerId = await createCustomer();
      await issue(customerId);

      const page = await firstPage({ customerId, status: 'CANCELLED' });

      expect(page).toEqual({ items: [], nextFolio: null });
    });
  });
});
