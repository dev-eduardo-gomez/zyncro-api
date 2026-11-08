import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import { Customer } from '../domain/models/customer.js';

@Injectable()
export class GetCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findById(id);
    if (customer === null) throw new NotFoundException();

    return customer;
  }
}
