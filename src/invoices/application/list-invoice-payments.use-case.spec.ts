import { NotFoundException } from '@nestjs/common';
import { ListInvoicePaymentsUseCase } from './list-invoice-payments.use-case.js';
import { PaymentRepository } from '../domain/ports/payment-repository.js';
import type { Payment } from '../domain/models/payment.js';

class FakePaymentRepository extends PaymentRepository {
  constructor(private readonly payments: Map<string, Payment[]>) {
    super();
  }

  register(): Promise<Payment | null> {
    throw new Error('not used by ListInvoicePaymentsUseCase');
  }

  findByInvoiceId(invoiceId: string): Promise<Payment[] | null> {
    return Promise.resolve(this.payments.get(invoiceId) ?? null);
  }
}

const storedPayment: Payment = {
  id: 'payment-1',
  invoiceId: 'invoice-1',
  amount: '400.00',
  appliedAmount: '400.00',
  creditAmount: '0.00',
  proofUrl: null,
  createdAt: new Date('2026-11-07T12:00:00Z'),
};

describe('ListInvoicePaymentsUseCase', () => {
  it("returns the invoice's payments as the repository orders them", async () => {
    const useCase = new ListInvoicePaymentsUseCase(
      new FakePaymentRepository(new Map([['invoice-1', [storedPayment]]])),
    );

    expect(await useCase.execute('invoice-1')).toEqual([storedPayment]);
  });

  it('returns an empty list for an invoice without payments', async () => {
    const useCase = new ListInvoicePaymentsUseCase(
      new FakePaymentRepository(new Map([['invoice-1', []]])),
    );

    expect(await useCase.execute('invoice-1')).toEqual([]);
  });

  it('throws NotFoundException when no invoice has that id', async () => {
    const useCase = new ListInvoicePaymentsUseCase(
      new FakePaymentRepository(new Map()),
    );

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
