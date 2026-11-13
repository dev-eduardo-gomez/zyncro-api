import { Injectable } from '@nestjs/common';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import { Clock } from '../../shared/domain/ports/clock.js';
import type {
  InvoicePageRequest,
  InvoiceViewPage,
} from '../domain/models/invoice.js';
import { deriveInvoiceStatus } from '../domain/services/derive-invoice-status.js';
import { computeDueDate } from '../domain/services/compute-due-date.js';

@Injectable()
export class ListInvoicesUseCase {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(request: InvoicePageRequest): Promise<InvoiceViewPage> {
    const today = computeDueDate(this.clock.now(), 0);
    const page = await this.invoiceRepository.findPage(request);

    return {
      items: page.items.map((invoice) => ({
        ...invoice,
        derivedStatus: deriveInvoiceStatus(invoice, today),
      })),
      nextFolio: page.nextFolio,
    };
  }
}
