import { NotFoundException } from '@nestjs/common';
import { GetInvoiceUseCase } from './get-invoice.use-case.js';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import type { Invoice } from '../domain/models/invoice.js';
import { Clock } from '../../shared/domain/ports/clock.js';

class FixedClock extends Clock {
  now(): Date {
    return new Date('2026-11-03T12:00:00Z');
  }
}

class FakeInvoiceRepository extends InvoiceRepository {
  constructor(private readonly invoice: Invoice | null) {
    super();
  }

  create(): Promise<Invoice> {
    throw new Error('not used by GetInvoiceUseCase');
  }

  findById(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.invoice?.id === id ? this.invoice : null);
  }
}

const storedInvoice: Invoice = {
  id: 'invoice-1',
  folio: 7,
  customerId: 'customer-1',
  currency: 'MXN',
  lineItems: [
    {
      description: 'Monthly subscription',
      quantity: 1,
      unitPrice: '1000.00',
      taxRate: 0.16,
      lineTotal: '1000.00',
    },
  ],
  subtotal: '1000.00',
  tax: '160.00',
  total: '1160.00',
  balance: '1160.00',
  status: 'PENDING',
  dueDate: '2026-11-05',
  createdAt: new Date('2026-10-06T12:00:00Z'),
  updatedAt: new Date('2026-10-06T12:00:00Z'),
};

describe('GetInvoiceUseCase', () => {
  it('returns the invoice with its status derived against the current date', async () => {
    const useCase = new GetInvoiceUseCase(
      new FakeInvoiceRepository(storedInvoice),
      new FixedClock(),
    );

    const result = await useCase.execute(storedInvoice.id);

    expect(result).toEqual({ ...storedInvoice, derivedStatus: 'DUE_SOON' });
  });

  it('throws NotFoundException when no invoice has that id', async () => {
    const useCase = new GetInvoiceUseCase(
      new FakeInvoiceRepository(null),
      new FixedClock(),
    );

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
