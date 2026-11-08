import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/shared/infrastructure/persistence/prisma/prisma.service.js';
import { PrismaInvoiceRepository } from '../../src/invoices/infrastructure/persistence/prisma-invoice-repository.js';
import type { NewInvoice } from '../../src/invoices/domain/models/invoice.js';

if (existsSync('.env')) process.loadEnvFile();

describe('PrismaInvoiceRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaInvoiceRepository;
  let customerId: string;
  const taxIdPrefix = `INV-INT-${Date.now()}`;

  const newInvoice = (overrides: Partial<NewInvoice> = {}): NewInvoice => ({
    customerId,
    currency: 'MXN',
    lineItems: [
      {
        description: 'Monthly subscription',
        quantity: 1,
        unitPrice: '1000.00',
        taxRate: 0.16,
        lineTotal: '1000.00',
      },
      {
        description: 'Setup fee',
        quantity: 1.5,
        unitPrice: '33.33',
        taxRate: 0,
        lineTotal: '50.00',
      },
    ],
    subtotal: '1050.00',
    tax: '160.00',
    total: '1210.00',
    dueDate: '2026-12-31',
    ...overrides,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    repository = new PrismaInvoiceRepository(prisma);

    const customer = await prisma.customer.create({
      data: {
        taxId: taxIdPrefix,
        legalName: 'Invoice Repository Int Corp',
        address: 'Av. Siempre Viva 123, CDMX',
        contactEmail: 'billing@invoice-repo.int',
        creditDays: 30,
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    // Line items go with their invoice (onDelete: Cascade).
    await prisma.invoice.deleteMany({
      where: { customer: { taxId: { startsWith: taxIdPrefix } } },
    });
    await prisma.customer.deleteMany({
      where: { taxId: { startsWith: taxIdPrefix } },
    });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('persists the invoice with its line items and returns the domain shape', async () => {
      const invoice = await repository.create(newInvoice());

      expect(invoice).toEqual({
        ...newInvoice(),
        id: expect.any(String),
        folio: expect.any(Number),
        balance: '1210.00',
        status: 'PENDING',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(
        await prisma.invoiceLineItem.count({ where: { invoiceId: invoice.id } }),
      ).toBe(2);
    });

    it('returns money with exactly two decimals, never the shortest form', async () => {
      const invoice = await repository.create(
        newInvoice({
          lineItems: [
            {
              description: 'Round amount',
              quantity: 2,
              unitPrice: '500.00',
              taxRate: 0,
              lineTotal: '1000.00',
            },
          ],
          subtotal: '1000.00',
          tax: '0.00',
          total: '1000.00',
        }),
      );

      expect(invoice.subtotal).toBe('1000.00');
      expect(invoice.tax).toBe('0.00');
      expect(invoice.total).toBe('1000.00');
      expect(invoice.balance).toBe('1000.00');
      expect(invoice.lineItems[0].unitPrice).toBe('500.00');
      expect(invoice.lineItems[0].lineTotal).toBe('1000.00');
    });

    it('keeps the full precision of the largest amount the schema allows (R1)', async () => {
      const invoice = await repository.create(
        newInvoice({
          lineItems: [
            {
              description: 'Largest amount',
              quantity: 1,
              unitPrice: '9999999999999.99',
              taxRate: 0,
              lineTotal: '9999999999999.99',
            },
          ],
          subtotal: '9999999999999.99',
          tax: '0.00',
          total: '9999999999999.99',
        }),
      );

      expect(invoice.total).toBe('9999999999999.99');
      expect(invoice.lineItems[0].unitPrice).toBe('9999999999999.99');
    });

    it('assigns a different, increasing folio to each invoice', async () => {
      const first = await repository.create(newInvoice());
      const second = await repository.create(newInvoice());

      expect(second.folio).toBeGreaterThan(first.folio);
    });

    it('persists nothing when a line item cannot be stored', async () => {
      const before = await prisma.invoice.count({ where: { customerId } });

      // Decimal(12,4) holds at most 8 integer digits: this line overflows.
      await expect(
        repository.create(
          newInvoice({
            lineItems: [
              ...newInvoice().lineItems,
              {
                description: 'Overflowing quantity',
                quantity: 123456789,
                unitPrice: '0.01',
                taxRate: 0,
                lineTotal: '1234567.89',
              },
            ],
          }),
        ),
      ).rejects.toThrow(/numeric field overflow/);

      expect(await prisma.invoice.count({ where: { customerId } })).toBe(
        before,
      );
    });
  });

  describe('findById', () => {
    it('returns the same invoice that create returned', async () => {
      const created = await repository.create(newInvoice());

      expect(await repository.findById(created.id)).toEqual(created);
    });

    it('returns the line items in position order, not insertion order', async () => {
      const stored = await prisma.invoice.create({
        data: {
          customerId,
          currency: 'MXN',
          subtotal: '30.00',
          tax: '0.00',
          total: '30.00',
          dueDate: new Date('2026-12-31'),
          lineItems: {
            create: [
              {
                position: 2,
                description: 'Third',
                quantity: 1,
                unitPrice: '10.00',
                taxRate: 0,
                lineTotal: '10.00',
              },
              {
                position: 0,
                description: 'First',
                quantity: 1,
                unitPrice: '10.00',
                taxRate: 0,
                lineTotal: '10.00',
              },
              {
                position: 1,
                description: 'Second',
                quantity: 1,
                unitPrice: '10.00',
                taxRate: 0,
                lineTotal: '10.00',
              },
            ],
          },
        },
      });

      const invoice = await repository.findById(stored.id);

      expect(invoice?.lineItems.map((item) => item.description)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });

    it('returns null when no invoice has that id', async () => {
      expect(await repository.findById(randomUUID())).toBeNull();
    });
  });
});
