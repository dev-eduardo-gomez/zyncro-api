import { Decimal } from 'decimal.js';
import { InvoiceCancelled } from '../errors/invoice-cancelled.error.js';
import type {
  InvoicePaymentState,
  PaymentAllocation,
} from '../models/payment.js';
import type { InvoiceStatus } from '../models/invoice.js';

export const allocatePayment = (
  invoicePayment: InvoicePaymentState,
  amount: string,
): PaymentAllocation => {
  if (invoicePayment.status === 'CANCELLED') throw new InvoiceCancelled();

  const balanceDecimal = Decimal(invoicePayment.balance);
  const amountDecimal = Decimal(amount);

  const appliedAmount = Decimal.min(amountDecimal, balanceDecimal);
  const creditAmount = amountDecimal.minus(appliedAmount);

  const newBalance = balanceDecimal.minus(appliedAmount);
  let newStatus: InvoiceStatus = invoicePayment.status;
  if (newBalance.equals(0)) newStatus = 'PAID';

  return {
    appliedAmount: appliedAmount.toFixed(2),
    creditAmount: creditAmount.toFixed(2),
    balance: newBalance.toFixed(2),
    status: newStatus,
  };
};
