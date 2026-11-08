import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/ports/customer-repository.js';
import { Customer } from '../domain/models/customer.js';

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(): Promise<Customer[]> {
    return await this.customerRepository.findAll();
  }
}
