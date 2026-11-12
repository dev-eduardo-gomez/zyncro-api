import type { InvoiceStatus } from './invoice.js';

export interface NewPayment {
  readonly amount: string;
  readonly proofUrl: string | null;
}

export interface Payment extends NewPayment {
  readonly id: string;
  readonly invoiceId: string;
  // amount = appliedAmount + creditAmount
  readonly appliedAmount: string;
  // Excess over the pending balance; "0.00" when there is none (R5).
  readonly creditAmount: string;
  readonly createdAt: Date;
}

// The invoice as it stands, under lock, when a payment arrives.
export interface InvoicePaymentState {
  readonly status: InvoiceStatus;
  readonly total: string;
  readonly balance: string;
}

// The domain's decision for one payment: how it splits and where it leaves
// the invoice.
export interface PaymentAllocation {
  readonly appliedAmount: string;
  readonly creditAmount: string;
  readonly balance: string;
  readonly status: InvoiceStatus;
}
