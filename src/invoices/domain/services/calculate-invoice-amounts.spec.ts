import { Decimal } from 'decimal.js';
import { calculateInvoiceAmounts } from './calculate-invoice-amounts.js';

describe('calculateInvoiceAmounts', () => {
  it('computes line totals, subtotal, tax and total for a single line', () => {
    const result = calculateInvoiceAmounts([
      {
        description: 'Monthly subscription',
        quantity: 1,
        unitPrice: '1000.00',
        taxRate: 0.16,
      },
    ]);

    expect(result).toEqual({
      lineItems: [
        {
          description: 'Monthly subscription',
          quantity: 1,
          unitPrice: '1000.00',
          taxRate: 0.16,
          lineTotal: '1000.00',
        },
      ],
      subtotal: '1000.00',
      tax: '160.00',
      total: '1160.00',
    });
  });

  it('rounds each line total so the subtotal equals the sum of the visible lines', () => {
    const line = {
      description: 'Consulting hours',
      quantity: 1.5,
      unitPrice: '33.33',
      taxRate: 0,
    };

    const result = calculateInvoiceAmounts([line, line]);

    expect(result.lineItems.map((item) => item.lineTotal)).toEqual([
      '50.00',
      '50.00',
    ]);
    expect(result.subtotal).toBe('100.00');
    expect(result.total).toBe('100.00');
  });

  it('rounds half-up, not half-to-even', () => {
    const result = calculateInvoiceAmounts([
      { description: 'Stickers', quantity: 2.5, unitPrice: '0.01', taxRate: 0 },
    ]);

    expect(result.lineItems[0].lineTotal).toBe('0.03');
  });

  it('rounds without binary floating-point drift', () => {
    const result = calculateInvoiceAmounts([
      { description: 'Cable', quantity: 1.005, unitPrice: '1.00', taxRate: 0 },
    ]);

    expect(result.lineItems[0].lineTotal).toBe('1.01');
  });

  it('rounds the tax once per invoice, not per line', () => {
    const line = {
      description: 'Pen',
      quantity: 1,
      unitPrice: '0.05',
      taxRate: 0.1,
    };

    const result = calculateInvoiceAmounts([line, line]);

    expect(result).toMatchObject({
      subtotal: '0.10',
      tax: '0.01',
      total: '0.11',
    });
  });

  it('applies each line its own tax rate', () => {
    const result = calculateInvoiceAmounts([
      { description: 'Taxed', quantity: 1, unitPrice: '100.00', taxRate: 0.16 },
      { description: 'Exempt', quantity: 2, unitPrice: '50.00', taxRate: 0 },
    ]);

    expect(result).toMatchObject({
      subtotal: '200.00',
      tax: '16.00',
      total: '216.00',
    });
  });

  it('neither changes nor depends on the global Decimal configuration', () => {
    Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

    try {
      const result = calculateInvoiceAmounts([
        { description: 'Pen', quantity: 1, unitPrice: '0.05', taxRate: 0.1 },
      ]);

      expect(result.tax).toBe('0.01');
      expect({
        precision: Decimal.precision,
        rounding: Decimal.rounding,
      }).toEqual({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });
    } finally {
      Decimal.set({ defaults: true });
    }
  });
});
