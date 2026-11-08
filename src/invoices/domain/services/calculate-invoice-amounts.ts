import type {
  InvoiceAmounts,
  InvoiceLineItemInput,
} from '../models/invoice.js';
import { Decimal } from 'decimal.js';

export const calculateInvoiceAmounts = (
  lineItems: readonly InvoiceLineItemInput[],
): InvoiceAmounts => {
  const calculatedLines = lineItems.map((line) => {
    const lineTotal = new Decimal(line.quantity)
      .mul(line.unitPrice)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return {
      ...line,
      lineTotal,
    };
  });

  const subtotal = calculatedLines.reduce(
    (acc, line) => acc.plus(line.lineTotal),
    new Decimal(0),
  );

  const tax = calculatedLines
    .reduce(
      (acc, line) => acc.plus(line.lineTotal.mul(line.taxRate)),
      new Decimal(0),
    )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const total = subtotal.plus(tax);

  return {
    lineItems: calculatedLines.map((line) => ({
      ...line,
      lineTotal: line.lineTotal.toFixed(2, Decimal.ROUND_HALF_UP),
    })),
    subtotal: subtotal.toFixed(2, Decimal.ROUND_HALF_UP),
    tax: tax.toFixed(2, Decimal.ROUND_HALF_UP),
    total: total.toFixed(2, Decimal.ROUND_HALF_UP),
  };
};
