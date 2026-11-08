import { CreateCustomerUseCase } from './create-customer.use-case.js';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import { DuplicateTaxId } from '../domain/errors/duplicate-tax-id.error.js';
import type { Customer, NewCustomer } from '../domain/models/customer.js';

class FakeCustomerRepository extends CustomerRepository {
  constructor(private readonly duplicateTaxId: string | null = null) {
    super();
  }

  create(newCustomer: NewCustomer): Promise<Customer> {
    if (newCustomer.taxId === this.duplicateTaxId) {
      return Promise.reject(new DuplicateTaxId(newCustomer.taxId));
    }

    return Promise.resolve({
      id: 'customer-1',
      ...newCustomer,
      creditBalance: '0.00',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
  }

  findById(): Promise<Customer | null> {
    throw new Error('not used by CreateCustomerUseCase');
  }

  findAll(): Promise<Customer[]> {
    throw new Error('not used by CreateCustomerUseCase');
  }

  update(): Promise<Customer | null> {
    throw new Error('not used by CreateCustomerUseCase');
  }
}

const newCustomer: NewCustomer = {
  taxId: 'TAX-1',
  legalName: 'Acme Corp',
  address: 'Av. Siempre Viva 123, CDMX',
  contactEmail: 'billing@acme.test',
  creditDays: 30,
};

describe('CreateCustomerUseCase', () => {
  it('creates the customer through the repository', async () => {
    const useCase = new CreateCustomerUseCase(new FakeCustomerRepository());

    const result = await useCase.execute(newCustomer);

    expect(result).toMatchObject(newCustomer);
    expect(result.creditBalance).toBe('0.00');
  });

  it('propagates DuplicateTaxId when the repository rejects a taxId already in use', async () => {
    const useCase = new CreateCustomerUseCase(
      new FakeCustomerRepository(newCustomer.taxId),
    );

    await expect(useCase.execute(newCustomer)).rejects.toThrow(DuplicateTaxId);
  });
});
