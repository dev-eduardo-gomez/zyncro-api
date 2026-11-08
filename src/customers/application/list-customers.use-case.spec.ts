import { ListCustomersUseCase } from './list-customers.use-case.js';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import type { Customer } from '../domain/models/customer.js';

class FakeCustomerRepository extends CustomerRepository {
  constructor(private readonly customers: Customer[]) {
    super();
  }

  create(): Promise<Customer> {
    throw new Error('not used by ListCustomersUseCase');
  }

  findById(): Promise<Customer | null> {
    throw new Error('not used by ListCustomersUseCase');
  }

  findAll(): Promise<Customer[]> {
    return Promise.resolve(this.customers);
  }

  update(): Promise<Customer | null> {
    throw new Error('not used by ListCustomersUseCase');
  }
}

const existingCustomer: Customer = {
  id: 'customer-1',
  taxId: 'TAX-1',
  legalName: 'Acme Corp',
  address: 'Av. Siempre Viva 123, CDMX',
  contactEmail: 'billing@acme.test',
  creditDays: 30,
  creditBalance: '0.00',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('ListCustomersUseCase', () => {
  it('returns every customer from the repository', async () => {
    const useCase = new ListCustomersUseCase(
      new FakeCustomerRepository([existingCustomer]),
    );

    const result = await useCase.execute();

    expect(result).toEqual([existingCustomer]);
  });

  it('returns an empty list when there are no customers', async () => {
    const useCase = new ListCustomersUseCase(new FakeCustomerRepository([]));

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
