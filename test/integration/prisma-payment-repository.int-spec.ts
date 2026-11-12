import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/shared/infrastructure/persistence/prisma/prisma.service.js';
import { PrismaPaymentRepository } from '../../src/invoices/infrastructure/persistence/prisma-payment-repository.js';
import type { AllocatePayment } from '../../src/invoices/domain/ports/payment-repository.js';
import type { InvoicePaymentState } from '../../src/invoices/domain/models/payment.js';
import { Decimal } from 'decimal.js';

if (existsSync('.env')) process.loadEnvFile();

// A test-only decision, so these tests pin the adapter (locking, writes,
// atomicity) and not the domain rule, which allocate-payment.spec covers.
const splitUpToBalance =
  (amount: string): AllocatePayment =>
  (invoice: InvoicePaymentState) => {
    const paid = Decimal(amount);
    const balance = Decimal(invoice.balance);
    const applied = Decimal.min(paid, balance);
    const remaining = balance.minus(applied);
    return {
      appliedAmount: applied.toFixed(2),
      creditAmount: paid.minus(applied).toFixed(2),
      balance: remaining.toFixed(2),
      status: remaining.isZero() ? 'PAID' : invoice.status,
    };
  };

describe('PrismaPaymentRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaPaymentRepository;
  const taxIdPrefix = `PAY-INT-${Date.now()}`;
  let sequence = 0;

  // Each invoice gets its own customer, so credit balances start at zero.
  const createInvoice = async (total = '1160.00') => {
    sequence += 1;
    const customer = await prisma.customer.create({
      data: {
        taxId: `${taxIdPrefix}-${sequence}`,
        legalName: 'Payment Repository Int Corp',
        address: 'Av. Siempre Viva 123, CDMX',
        contactEmail: `billing-${sequence}@payment-repo.int`,
        creditDays: 30,
      },
    });
    const invoice = await prisma.invoice.create({
      data: {
        customerId: customer.id,
        currency: 'MXN',
        subtotal: total,
        tax: '0.00',
        total,
        balance: total,
        dueDate: new Date('2026-12-31'),
      },
    });
    return { invoiceId: invoice.id, customerId: customer.id };
  };

  const creditOf = async (customerId: string) =>
    (
      await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })
    ).creditBalance.toFixed(2);

  beforeAll(() => {
    prisma = new PrismaService();
    repository = new PrismaPaymentRepository(prisma);
  });

  afterAll(async () => {
    const owned = { customer: { taxId: { startsWith: taxIdPrefix } } };
    await prisma.payment.deleteMany({ where: { invoice: owned } });
    await prisma.invoice.deleteMany({ where: owned });
    await prisma.customer.deleteMany({
      where: { taxId: { startsWith: taxIdPrefix } },
    });
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('stores the payment and returns the domain shape with exact money', async () => {
      const { invoiceId } = await createInvoice();

      const payment = await repository.register(
        invoiceId,
        { amount: '400.00', proofUrl: null },
        splitUpToBalance('400.00'),
      );

      expect(payment).toEqual({
        id: expect.any(String),
        invoiceId,
        amount: '400.00',
        appliedAmount: '400.00',
        creditAmount: '0.00',
        proofUrl: null,
        createdAt: expect.any(Date),
      });
    });

    it("updates the invoice's balance and status with the decision", async () => {
      const { invoiceId } = await createInvoice();

      await repository.register(
        invoiceId,
        { amount: '1160.00', proofUrl: null },
        splitUpToBalance('1160.00'),
      );

      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });
      expect(invoice.balance.toFixed(2)).toBe('0.00');
      expect(invoice.status).toBe('PAID');
    });

    it("hands the decision the invoice's current status, total and balance", async () => {
      const { invoiceId } = await createInvoice();
      await repository.register(
        invoiceId,
        { amount: '160.00', proofUrl: null },
        splitUpToBalance('160.00'),
      );
      const allocate = vi.fn(splitUpToBalance('10.00'));

      await repository.register(
        invoiceId,
        { amount: '10.00', proofUrl: null },
        allocate,
      );

      expect(allocate).toHaveBeenCalledWith({
        status: 'PENDING',
        total: '1160.00',
        balance: '1000.00',
      });
    });

    it("adds the credit to the customer's credit balance (R5)", async () => {
      const { invoiceId, customerId } = await createInvoice();

      const payment = await repository.register(
        invoiceId,
        { amount: '1400.00', proofUrl: 'https://proofs.test/transfer.pdf' },
        splitUpToBalance('1400.00'),
      );

      expect(payment?.creditAmount).toBe('240.00');
      expect(payment?.proofUrl).toBe('https://proofs.test/transfer.pdf');
      expect(await creditOf(customerId)).toBe('240.00');
    });

    it('returns null and decides nothing when the invoice does not exist', async () => {
      const allocate = vi.fn(splitUpToBalance('100.00'));

      const payment = await repository.register(
        randomUUID(),
        { amount: '100.00', proofUrl: null },
        allocate,
      );

      expect(payment).toBeNull();
      expect(allocate).not.toHaveBeenCalled();
    });

    it('writes nothing when the decision throws', async () => {
      const { invoiceId } = await createInvoice();
      const refusal = new Error('refused by the domain');

      await expect(
        repository.register(
          invoiceId,
          { amount: '100.00', proofUrl: null },
          () => {
            throw refusal;
          },
        ),
      ).rejects.toBe(refusal);

      expect(await prisma.payment.count({ where: { invoiceId } })).toBe(0);
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });
      expect(invoice.balance.toFixed(2)).toBe('1160.00');
    });

    it('never applies the same balance twice under concurrent payments', async () => {
      const { invoiceId, customerId } = await createInvoice();

      // Without a row lock both transactions read balance 1160.00, both apply
      // it in full, and the second payment's credit is lost.
      const payments = await Promise.all([
        repository.register(
          invoiceId,
          { amount: '1160.00', proofUrl: null },
          splitUpToBalance('1160.00'),
        ),
        repository.register(
          invoiceId,
          { amount: '1160.00', proofUrl: null },
          splitUpToBalance('1160.00'),
        ),
      ]);

      expect(payments.map((payment) => payment?.appliedAmount).sort()).toEqual([
        '0.00',
        '1160.00',
      ]);
      expect(payments.map((payment) => payment?.creditAmount).sort()).toEqual([
        '0.00',
        '1160.00',
      ]);
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });
      expect(invoice.balance.toFixed(2)).toBe('0.00');
      expect(await creditOf(customerId)).toBe('1160.00');
    });
  });

  describe('findByInvoiceId', () => {
    it("returns the invoice's payments oldest first", async () => {
      const { invoiceId } = await createInvoice();
      await repository.register(
        invoiceId,
        { amount: '100.00', proofUrl: null },
        splitUpToBalance('100.00'),
      );
      await repository.register(
        invoiceId,
        { amount: '200.00', proofUrl: null },
        splitUpToBalance('200.00'),
      );

      const payments = await repository.findByInvoiceId(invoiceId);

      expect(payments?.map((payment) => payment.amount)).toEqual([
        '100.00',
        '200.00',
      ]);
    });

    it('returns an empty list for an invoice without payments', async () => {
      const { invoiceId } = await createInvoice();

      expect(await repository.findByInvoiceId(invoiceId)).toEqual([]);
    });

    it('returns null when the invoice does not exist', async () => {
      expect(await repository.findByInvoiceId(randomUUID())).toBeNull();
    });
  });
});
