import type { Invoice, NewInvoice } from '../models/invoice.js';

export abstract class InvoiceRepository {
  // Persistence assigns `id`, `folio` (unique sequence, R3) and status
  // `PENDING`, and stores `balance` equal to `total`; payments lower it later
  // through PaymentRepository.
  abstract create(invoice: NewInvoice): Promise<Invoice>;
  abstract findById(id: string): Promise<Invoice | null>;
}
