import type {
  Customer,
  CustomerChanges,
  NewCustomer,
} from '../models/customer.js';

export abstract class CustomerRepository {
  abstract create(customer: NewCustomer): Promise<Customer>;
  abstract findById(id: string): Promise<Customer | null>;
  abstract findAll(): Promise<Customer[]>;
  abstract update(
    id: string,
    changes: CustomerChanges,
  ): Promise<Customer | null>;
}
