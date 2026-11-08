import type { Invoice, NewInvoice } from '../models/invoice.js';

export abstract class InvoiceRepository {
  // Persistence assigns `id`, `folio` (unique sequence, R3) and status
  // `PENDING`; `balance` equals `total` until payments exist (T3).
  abstract create(invoice: NewInvoice): Promise<Invoice>;
  abstract findById(id: string): Promise<Invoice | null>;
}
