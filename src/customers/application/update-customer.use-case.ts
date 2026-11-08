import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import { Customer, CustomerChanges } from '../domain/models/customer.js';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    id: string,
    customer: CustomerChanges,
  ): Promise<Customer | null> {
    const updatedCustomer = await this.customerRepository.update(id, customer);
    if (updatedCustomer === null) throw new NotFoundException();
    return updatedCustomer;
  }
}
