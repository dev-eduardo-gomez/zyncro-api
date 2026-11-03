import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/ports/customer-repository.js';
import { PrismaService } from '../../../shared/infrastructure/persistence/prisma/prisma.service.js';
import {
  Customer,
  CustomerChanges,
  NewCustomer,
} from '../../domain/models/customer.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { DuplicateTaxId } from '../../domain/errors/duplicate-tax-id.error.js';

@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async create(customer: NewCustomer): Promise<Customer> {
    try {
      const createdCustomer = await this.prismaService.customer.create({
        data: customer,
      });

      return {
        ...createdCustomer,
        creditBalance: createdCustomer.creditBalance.toFixed(2),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new DuplicateTaxId(customer.taxId);
      }

      throw error;
    }
  }

  async findAll(): Promise<Customer[]> {
    const customers = await this.prismaService.customer.findMany();
    return customers.map((customer) => ({
      ...customer,
      creditBalance: customer.creditBalance.toFixed(2),
    }));
  }

  async findById(id: string): Promise<Customer | null> {
    const customer = await this.prismaService.customer.findUnique({
      where: {
        id,
      },
    });

    if (customer === null) return null;

    return {
      ...customer,
      creditBalance: customer.creditBalance.toFixed(2),
    };
  }

  async update(id: string, changes: CustomerChanges): Promise<Customer | null> {
    try {
      const updatedCustomer = await this.prismaService.customer.update({
        where: { id },
        data: changes,
      });

      return {
        ...updatedCustomer,
        creditBalance: updatedCustomer.creditBalance.toFixed(2),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return null;
      }

      throw error;
    }
  }
}
