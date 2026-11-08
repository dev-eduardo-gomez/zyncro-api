import { NotFoundException } from '@nestjs/common';
import { UpdateCustomerUseCase } from './update-customer.use-case.js';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import type { Customer, CustomerChanges } from '../domain/models/customer.js';

class FakeCustomerRepository extends CustomerRepository {
  constructor(private readonly customer: Customer | null) {
    super();
  }

  create(): Promise<Customer> {
    throw new Error('not used by UpdateCustomerUseCase');
  }

  findById(): Promise<Customer | null> {
    throw new Error('not used by UpdateCustomerUseCase');
  }

  findAll(): Promise<Customer[]> {
    throw new Error('not used by UpdateCustomerUseCase');
  }

  update(id: string, changes: CustomerChanges): Promise<Customer | null> {
    if (this.customer?.id !== id) return Promise.resolve(null);

    return Promise.resolve({ ...this.customer, ...changes });
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

describe('UpdateCustomerUseCase', () => {
  it("updates the customer's editable fields, leaving taxId untouched", async () => {
    const useCase = new UpdateCustomerUseCase(
      new FakeCustomerRepository(existingCustomer),
    );

    const result = await useCase.execute(existingCustomer.id, {
      legalName: 'Acme Corp Renamed',
      creditDays: 45,
    });

    expect(result).toMatchObject({
      taxId: existingCustomer.taxId,
      legalName: 'Acme Corp Renamed',
      creditDays: 45,
    });
  });

  it('throws NotFoundException when no customer has that id', async () => {
    const useCase = new UpdateCustomerUseCase(new FakeCustomerRepository(null));

    await expect(
      useCase.execute('missing-id', { legalName: 'Nobody' }),
    ).rejects.toThrow(NotFoundException);
  });
});
