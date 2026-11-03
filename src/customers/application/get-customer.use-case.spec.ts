import { NotFoundException } from '@nestjs/common';
import { GetCustomerUseCase } from './get-customer.use-case.js';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import type { Customer } from '../domain/models/customer.js';

class FakeCustomerRepository extends CustomerRepository {
  constructor(private readonly customer: Customer | null) {
    super();
  }

  create(): Promise<Customer> {
    throw new Error('not used by GetCustomerUseCase');
  }

  findById(id: string): Promise<Customer | null> {
    return Promise.resolve(this.customer?.id === id ? this.customer : null);
  }

  findAll(): Promise<Customer[]> {
    throw new Error('not used by GetCustomerUseCase');
  }

  update(): Promise<Customer | null> {
    throw new Error('not used by GetCustomerUseCase');
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

describe('GetCustomerUseCase', () => {
  it('returns the customer found by id', async () => {
    const useCase = new GetCustomerUseCase(
      new FakeCustomerRepository(existingCustomer),
    );

    const result = await useCase.execute(existingCustomer.id);

    expect(result).toEqual(existingCustomer);
  });

  it('throws NotFoundException when no customer has that id', async () => {
    const useCase = new GetCustomerUseCase(new FakeCustomerRepository(null));

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
