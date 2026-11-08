import { Module } from '@nestjs/common';
import { ClockModule } from '../shared/infrastructure/time/clock.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { InvoicesController } from './infrastructure/http/invoices.controller.js';
import { InvoiceRepository } from './domain/ports/invoice-repository.js';
import { PrismaInvoiceRepository } from './infrastructure/persistence/prisma-invoice-repository.js';
import { CreateInvoiceUseCase } from './application/create-invoice.use-case.js';
import { GetInvoiceUseCase } from './application/get-invoice.use-case.js';

@Module({
  imports: [ClockModule, CustomersModule],
  controllers: [InvoicesController],
  providers: [
    CreateInvoiceUseCase,
    GetInvoiceUseCase,
    {
      provide: InvoiceRepository,
      useClass: PrismaInvoiceRepository,
    },
  ],
  exports: [],
})
export class InvoicesModule {}
