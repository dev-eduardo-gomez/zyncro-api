import { NotFoundException } from '@nestjs/common';
import { RegisterPaymentUseCase } from './register-payment.use-case.js';
import {
  type AllocatePayment,
  PaymentRepository,
} from '../domain/ports/payment-repository.js';
import type {
  InvoicePaymentState,
  NewPayment,
  Payment,
} from '../domain/models/payment.js';
import { InvoiceCancelled } from '../domain/errors/invoice-cancelled.error.js';

class FakePaymentRepository extends PaymentRepository {
  constructor(private readonly invoices: Map<string, InvoicePaymentState>) {
    super();
  }

  register(
    invoiceId: string,
    payment: NewPayment,
    allocate: AllocatePayment,
  ): Promise<Payment | null> {
    const invoice = this.invoices.get(invoiceId);
    if (invoice === undefined) return Promise.resolve(null);

    const allocation = allocate(invoice);
    return Promise.resolve({
      id: 'payment-1',
      invoiceId,
      ...payment,
      appliedAmount: allocation.appliedAmount,
      creditAmount: allocation.creditAmount,
      createdAt: new Date('2026-11-07T12:00:00Z'),
    });
  }

  findByInvoiceId(): Promise<Payment[] | null> {
    throw new Error('not used by RegisterPaymentUseCase');
  }
}

const repositoryWith = (state: InvoicePaymentState) =>
  new FakePaymentRepository(new Map([['invoice-1', state]]));

describe('RegisterPaymentUseCase', () => {
  it('stores the payment split decided by the domain', async () => {
    const useCase = new RegisterPaymentUseCase(
      repositoryWith({ status: 'PENDING', total: '1160.00', balance: '760.00' }),
    );

    const payment = await useCase.execute('invoice-1', {
      amount: '1000.00',
      proofUrl: 'https://proofs.test/transfer-1.pdf',
    });

    expect(payment).toEqual({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      amount: '1000.00',
      appliedAmount: '760.00',
      creditAmount: '240.00',
      proofUrl: 'https://proofs.test/transfer-1.pdf',
      createdAt: new Date('2026-11-07T12:00:00Z'),
    });
  });

  it('propagates InvoiceCancelled for a cancelled invoice', async () => {
    const useCase = new RegisterPaymentUseCase(
      repositoryWith({
        status: 'CANCELLED',
        total: '1160.00',
        balance: '1160.00',
      }),
    );

    await expect(
      useCase.execute('invoice-1', { amount: '100.00', proofUrl: null }),
    ).rejects.toThrow(InvoiceCancelled);
  });

  it('throws NotFoundException when no invoice has that id', async () => {
    const useCase = new RegisterPaymentUseCase(
      new FakePaymentRepository(new Map()),
    );

    await expect(
      useCase.execute('missing-id', { amount: '100.00', proofUrl: null }),
    ).rejects.toThrow(NotFoundException);
  });
});
