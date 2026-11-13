import type { Invoice, NewInvoice } from '../models/invoice.js';

export abstract class InvoiceRepository {
  abstract create(invoice: NewInvoice): Promise<Invoice>;
  abstract findById(id: string): Promise<Invoice | null>;
}
