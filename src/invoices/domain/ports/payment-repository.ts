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
  abstract register(
    invoiceId: string,
    payment: NewPayment,
    allocate: AllocatePayment,
  ): Promise<Payment | null>;

  abstract findByInvoiceId(invoiceId: string): Promise<Payment[] | null>;
}
