import type {
  InvoicePaymentState,
  NewPayment,
  Payment,
  PaymentAllocation,
} from '../models/payment.js';

export type AllocatePayment = (
  invoice: InvoicePaymentState,
) => PaymentAllocation;

export abstract class PaymentRepository {
  // Locks the invoice, asks `allocate` for the decision while the lock is held,
  // then stores the payment, the invoice's new balance and status, and any
  // credit on the customer, all or nothing. An error thrown by `allocate`
  // writes nothing. Returns null when the invoice does not exist.
  abstract register(
    invoiceId: string,
    payment: NewPayment,
    allocate: AllocatePayment,
  ): Promise<Payment | null>;

  // Oldest first. Returns null when the invoice does not exist.
  abstract findByInvoiceId(invoiceId: string): Promise<Payment[] | null>;
}
