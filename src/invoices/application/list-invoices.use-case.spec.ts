import { ListInvoicesUseCase } from './list-invoices.use-case.js';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import type {
  Invoice,
  InvoicePage,
  InvoicePageRequest,
} from '../domain/models/invoice.js';
import { Clock } from '../../shared/domain/ports/clock.js';

class CountingClock extends Clock {
  calls = 0;

  now(): Date {
    this.calls += 1;
    return new Date('2026-11-03T12:00:00Z');
  }
}

class FakeInvoiceRepository extends InvoiceRepository {
  received: InvoicePageRequest | null = null;

  constructor(private readonly page: InvoicePage) {
    super();
  }

  create(): Promise<Invoice> {
    throw new Error('not used by ListInvoicesUseCase');
  }

  findById(): Promise<Invoice | null> {
    throw new Error('not used by ListInvoicesUseCase');
  }

  findPage(request: InvoicePageRequest): Promise<InvoicePage> {
    this.received = request;
    return Promise.resolve(this.page);
  }
}

const invoice = (overrides: Partial<Invoice>): Invoice => ({
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
  dueDate: '2026-12-31',
  createdAt: new Date('2026-10-06T12:00:00Z'),
  updatedAt: new Date('2026-10-06T12:00:00Z'),
  ...overrides,
});

const pageRequest: InvoicePageRequest = {
  filter: { status: 'PENDING', customerId: 'customer-1', minTotal: '100.00' },
  afterFolio: 12,
  limit: 2,
};

describe('ListInvoicesUseCase', () => {
  it('passes the filter, cursor and limit to the repository unchanged', async () => {
    const repository = new FakeInvoiceRepository({
      items: [],
      nextFolio: null,
    });
    const useCase = new ListInvoicesUseCase(repository, new CountingClock());

    await useCase.execute(pageRequest);

    expect(repository.received).toEqual(pageRequest);
  });

  it('returns every invoice with its status derived against the current date', async () => {
    const dueSoon = invoice({
      id: 'due-soon',
      folio: 9,
      dueDate: '2026-11-05',
    });
    const partial = invoice({ id: 'partial', folio: 8, balance: '160.00' });
    const plain = invoice({ id: 'plain', folio: 7 });
    const useCase = new ListInvoicesUseCase(
      new FakeInvoiceRepository({
        items: [dueSoon, partial, plain],
        nextFolio: 7,
      }),
      new CountingClock(),
    );

    const result = await useCase.execute(pageRequest);

    expect(result).toEqual({
      items: [
        { ...dueSoon, derivedStatus: 'DUE_SOON' },
        { ...partial, derivedStatus: 'PARTIAL' },
        { ...plain, derivedStatus: null },
      ],
      nextFolio: 7,
    });
  });

  it('reads the clock once per page, not once per invoice', async () => {
    const clock = new CountingClock();
    const useCase = new ListInvoicesUseCase(
      new FakeInvoiceRepository({
        items: [invoice({ folio: 2 }), invoice({ folio: 1 })],
        nextFolio: null,
      }),
      clock,
    );

    await useCase.execute(pageRequest);

    expect(clock.calls).toBe(1);
  });
});
