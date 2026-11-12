import { Decimal } from 'decimal.js';
import type { Invoice, InvoiceDerivedStatus } from '../models/invoice.js';
import { computeDueDate } from './compute-due-date.js';

const DUE_SOON_WINDOW_DAYS = 5;

type DerivedStatusInput = Pick<
  Invoice,
  'status' | 'dueDate' | 'total' | 'balance'
>;

const isDueSoon = (invoice: DerivedStatusInput, today: string): boolean => {
  const windowEnd = computeDueDate(new Date(today), DUE_SOON_WINDOW_DAYS);
  return (
    invoice.status === 'PENDING' &&
    today <= invoice.dueDate &&
    invoice.dueDate <= windowEnd
  );
};

const isPartiallyPaid = (invoice: DerivedStatusInput): boolean => {
  const balance = new Decimal(invoice.balance);
  return balance.lessThan(invoice.total) && balance.greaterThan(0);
};

export const deriveInvoiceStatus = (
  invoice: DerivedStatusInput,
  today: string,
): InvoiceDerivedStatus => {
  if (isDueSoon(invoice, today)) return 'DUE_SOON';
  if (isPartiallyPaid(invoice)) return 'PARTIAL';
  return null;
};
