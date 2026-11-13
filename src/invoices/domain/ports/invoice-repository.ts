import type {
  Invoice,
  InvoicePage,
  InvoicePageRequest,
  NewInvoice,
} from '../models/invoice.js';

export abstract class InvoiceRepository {
  abstract create(invoice: NewInvoice): Promise<Invoice>;
  abstract findById(id: string): Promise<Invoice | null>;
  abstract findPage(request: InvoicePageRequest): Promise<InvoicePage>;
}
