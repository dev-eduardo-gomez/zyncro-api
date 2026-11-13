import type { InvoiceStatus } from './invoice.js';

export interface NewPayment {
  readonly amount: string;
  readonly proofUrl: string | null;
}

export interface Payment extends NewPayment {
  readonly id: string;
  readonly invoiceId: string;
  readonly appliedAmount: string;
  readonly creditAmount: string;
  readonly createdAt: Date;
}

export interface InvoicePaymentState {
  readonly status: InvoiceStatus;
  readonly total: string;
  readonly balance: string;
}

export interface PaymentAllocation {
  readonly appliedAmount: string;
  readonly creditAmount: string;
  readonly balance: string;
  readonly status: InvoiceStatus;
}
