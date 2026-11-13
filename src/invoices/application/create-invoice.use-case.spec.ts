import { NotFoundException } from '@nestjs/common';
import { CreateInvoiceUseCase } from './create-invoice.use-case.js';
import { CustomerRepository } from '../../customers/domain/ports/customer-repository.js';
import type { Customer } from '../../customers/domain/models/customer.js';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import type {
  CreateInvoiceRequest,
  Invoice,
  InvoicePage,
  NewInvoice,
} from '../domain/models/invoice.js';
import { Clock } from '../../shared/domain/ports/clock.js';

const NOW = new Date('2026-11-03T12:00:00Z');

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class FakeCustomerRepository extends CustomerRepository {
  constructor(private readonly customer: Customer | null) {
    super();
  }

  create(): Promise<Customer> {
    throw new Error('not used by CreateInvoiceUseCase');
  }

  findById(id: string): Promise<Customer | null> {
    return Promise.resolve(this.customer?.id === id ? this.customer : null);
  }

  findAll(): Promise<Customer[]> {
    throw new Error('not used by CreateInvoiceUseCase');
  }

  update(): Promise<Customer | null> {
    throw new Error('not used by CreateInvoiceUseCase');
  }
}

class RecordingInvoiceRepository extends InvoiceRepository {
  readonly created: NewInvoice[] = [];

  create(invoice: NewInvoice): Promise<Invoice> {
    this.created.push(invoice);
    return Promise.resolve(persisted(invoice));
  }

  findById(): Promise<Invoice | null> {
    throw new Error('not used by CreateInvoiceUseCase');
  }

  findPage(): Promise<InvoicePage> {
    throw new Error('not used by CreateInvoiceUseCase');
  }
}

const persisted = (invoice: NewInvoice): Invoice => ({
  ...invoice,
  id: 'invoice-1',
  folio: 1,
  balance: invoice.total,
  status: 'PENDING',
  createdAt: NOW,
  updatedAt: NOW,
});

const customerWithCreditDays = (creditDays: number): Customer => ({
  id: 'customer-1',
  taxId: 'TAX-1',
  legalName: 'Acme Corp',
  address: 'Av. Siempre Viva 123, CDMX',
  contactEmail: 'billing@acme.test',
  creditDays,
  creditBalance: '0.00',
  createdAt: NOW,
  updatedAt: NOW,
});

const request: CreateInvoiceRequest = {
  customerId: 'customer-1',
  currency: 'MXN',
  lineItems: [
    {
      description: 'Monthly subscription',
      quantity: 1,
      unitPrice: '1000.00',
      taxRate: 0.16,
    },
    { description: 'Setup fee', quantity: 1.5, unitPrice: '33.33', taxRate: 0 },
  ],
};

const setup = (customer: Customer | null) => {
  const invoices = new RecordingInvoiceRepository();
  const useCase = new CreateInvoiceUseCase(
    new FakeCustomerRepository(customer),
    invoices,
    new FixedClock(),
  );
  return { useCase, invoices };
};

describe('CreateInvoiceUseCase', () => {
  it('throws NotFoundException and creates nothing when the customer does not exist', async () => {
    const { useCase, invoices } = setup(null);

    await expect(useCase.execute(request)).rejects.toThrow(NotFoundException);
    expect(invoices.created).toEqual([]);
  });

  it('persists the computed amounts and the due date from the customer credit days', async () => {
    const { useCase, invoices } = setup(customerWithCreditDays(30));

    await useCase.execute(request);

    expect(invoices.created).toEqual([
      {
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
        dueDate: '2026-12-03',
      },
    ]);
  });

  it('returns the persisted invoice with no derived status when the due date is far', async () => {
    const { useCase, invoices } = setup(customerWithCreditDays(30));

    const result = await useCase.execute(request);

    expect(result).toEqual({
      ...persisted(invoices.created[0]),
      derivedStatus: null,
    });
  });

  it('returns DUE_SOON when the customer credit days fall inside the reminder window', async () => {
    const { useCase } = setup(customerWithCreditDays(3));

    const result = await useCase.execute(request);

    expect(result.derivedStatus).toBe('DUE_SOON');
  });
});
