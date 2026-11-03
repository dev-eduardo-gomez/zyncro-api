import { Module } from '@nestjs/common';
import { CustomersController } from './infrastructure/http/customers.controller.js';
import { CreateCustomerUseCase } from './application/create-customer.use-case.js';
import { GetCustomerUseCase } from './application/get-customer.use-case.js';
import { ListCustomersUseCase } from './application/list-customers.use-case.js';
import { UpdateCustomerUseCase } from './application/update-customer.use-case.js';
import { CustomerRepository } from './domain/ports/customer-repository.js';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer-repository.js';
import { PrismaModule } from '../shared/infrastructure/persistence/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
    UpdateCustomerUseCase,
    {
      provide: CustomerRepository,
      useClass: PrismaCustomerRepository,
    },
  ],
})
export class CustomersModule {}
