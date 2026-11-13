import { Module } from '@nestjs/common';
import { ClockModule } from '../shared/infrastructure/time/clock.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { InvoicesController } from './infrastructure/http/invoices.controller.js';
import { InvoiceRepository } from './domain/ports/invoice-repository.js';
import { PrismaInvoiceRepository } from './infrastructure/persistence/prisma-invoice-repository.js';
import { CreateInvoiceUseCase } from './application/create-invoice.use-case.js';
import { GetInvoiceUseCase } from './application/get-invoice.use-case.js';
import { RegisterPaymentUseCase } from './application/register-payment.use-case.js';
import { ListInvoicePaymentsUseCase } from './application/list-invoice-payments.use-case.js';
import { ListInvoicesUseCase } from './application/list-invoices.use-case.js';
import { PaymentRepository } from './domain/ports/payment-repository.js';
import { PrismaPaymentRepository } from './infrastructure/persistence/prisma-payment-repository.js';

@Module({
  imports: [ClockModule, CustomersModule],
  controllers: [InvoicesController],
  providers: [
    CreateInvoiceUseCase,
    GetInvoiceUseCase,
    RegisterPaymentUseCase,
    ListInvoicePaymentsUseCase,
    ListInvoicesUseCase,
    {
      provide: InvoiceRepository,
      useClass: PrismaInvoiceRepository,
    },
    {
      provide: PaymentRepository,
      useClass: PrismaPaymentRepository,
    },
  ],
  exports: [],
})
export class InvoicesModule {}
