import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import { Customer, NewCustomer } from '../domain/models/customer.js';

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(customer: NewCustomer): Promise<Customer> {
    return await this.customerRepository.create(customer);
  }
}
