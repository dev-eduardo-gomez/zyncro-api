export type InvoiceStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'DISPUTED';

export type InvoiceDerivedStatus = 'PARTIAL' | 'DUE_SOON' | null;

export interface InvoiceLineItemInput {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: string;
  readonly taxRate: number;
}

export interface InvoiceLineItem extends InvoiceLineItemInput {
  readonly lineTotal: string;
}

export interface InvoiceAmounts {
  readonly lineItems: InvoiceLineItem[];
  readonly subtotal: string;
  readonly tax: string;
  readonly total: string;
}

export interface NewInvoice extends InvoiceAmounts {
  readonly customerId: string;
  readonly currency: string;
  // YYYY-MM-DD
  readonly dueDate: string;
}

export interface Invoice extends NewInvoice {
  readonly id: string;
  readonly folio: number;
  readonly balance: string;
  readonly status: InvoiceStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InvoiceView extends Invoice {
  readonly derivedStatus: InvoiceDerivedStatus;
}

export interface CreateInvoiceRequest {
  readonly customerId: string;
  readonly currency: string;
  readonly lineItems: InvoiceLineItemInput[];
}
