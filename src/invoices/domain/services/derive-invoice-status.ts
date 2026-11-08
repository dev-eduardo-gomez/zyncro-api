import type {
  Invoice,
  InvoiceDerivedStatus,
} from '../models/invoice.js';
import { computeDueDate } from './compute-due-date.js';

// Same T-5 window as the reminders in #8.
const DUE_SOON_WINDOW_DAYS = 5;

export const deriveInvoiceStatus = (
  invoice: Pick<Invoice, 'status' | 'dueDate'>,
  // YYYY-MM-DD (UTC)
  today: string,
): InvoiceDerivedStatus => {
  if (invoice.status !== 'PENDING') return null;

  // A date-only ISO string parses as UTC midnight, matching computeDueDate.
  const windowEnd = computeDueDate(new Date(today), DUE_SOON_WINDOW_DAYS);

  // Zero-padded YYYY-MM-DD strings sort chronologically.
  return today <= invoice.dueDate && invoice.dueDate <= windowEnd
    ? 'DUE_SOON'
    : null;
};
