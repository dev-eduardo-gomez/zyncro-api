import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import { CustomerRepository } from '../../customers/domain/ports/customer-repository.js';
import { Clock } from '../../shared/domain/ports/clock.js';
import type {
  CreateInvoiceRequest,
  InvoiceView,
} from '../domain/models/invoice.js';
import { calculateInvoiceAmounts } from '../domain/services/calculate-invoice-amounts.js';
import { computeDueDate } from '../domain/services/compute-due-date.js';
import { deriveInvoiceStatus } from '../domain/services/derive-invoice-status.js';

@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(invoice: CreateInvoiceRequest): Promise<InvoiceView> {
    const now = this.clock.now();

    const customer = await this.customerRepository.findById(invoice.customerId);
    if (customer === null) throw new NotFoundException();

    const invoiceAmount = calculateInvoiceAmounts(invoice.lineItems);
    const dueDate = computeDueDate(now, customer.creditDays);

    const createdInvoice = await this.invoiceRepository.create({
      ...invoice,
      lineItems: invoiceAmount.lineItems,
      subtotal: invoiceAmount.subtotal,
      tax: invoiceAmount.tax,
      total: invoiceAmount.total,
      dueDate: dueDate,
    });

    const deriveInvoice = deriveInvoiceStatus(
      createdInvoice,
      computeDueDate(now, 0),
    );

    return {
      ...createdInvoice,
      derivedStatus: deriveInvoice,
    };
  }
}
