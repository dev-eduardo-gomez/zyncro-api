import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from '../domain/ports/invoice-repository.js';
import { Clock } from '../../shared/domain/ports/clock.js';
import { InvoiceView } from '../domain/models/invoice.js';
import { deriveInvoiceStatus } from '../domain/services/derive-invoice-status.js';
import { computeDueDate } from '../domain/services/compute-due-date.js';

@Injectable()
export class GetInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<InvoiceView> {
    const now = this.clock.now();
    const invoice = await this.invoiceRepository.findById(id);
    if (invoice === null) throw new NotFoundException();

    const deriveInvoice = deriveInvoiceStatus(invoice, computeDueDate(now, 0));

    return {
      ...invoice,
      derivedStatus: deriveInvoice,
    };
  }
}
