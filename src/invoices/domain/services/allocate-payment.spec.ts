import { allocatePayment } from './allocate-payment.js';
import { InvoiceCancelled } from '../errors/invoice-cancelled.error.js';
import type { InvoicePaymentState } from '../models/payment.js';

const unpaid: InvoicePaymentState = {
  status: 'PENDING',
  total: '1160.00',
  balance: '1160.00',
};

describe('allocatePayment', () => {
  it('applies a payment of the exact balance and marks the invoice PAID', () => {
    expect(allocatePayment(unpaid, '1160.00')).toEqual({
      appliedAmount: '1160.00',
      creditAmount: '0.00',
      balance: '0.00',
      status: 'PAID',
    });
  });

  it('applies a partial payment and keeps the invoice PENDING', () => {
    expect(allocatePayment(unpaid, '400.00')).toEqual({
      appliedAmount: '400.00',
      creditAmount: '0.00',
      balance: '760.00',
      status: 'PENDING',
    });
  });

  it('applies up to the balance and turns the excess into credit (R5)', () => {
    expect(
      allocatePayment({ ...unpaid, balance: '760.00' }, '1000.00'),
    ).toEqual({
      appliedAmount: '760.00',
      creditAmount: '240.00',
      balance: '0.00',
      status: 'PAID',
    });
  });

  it('turns a payment on a PAID invoice entirely into credit', () => {
    expect(
      allocatePayment({ ...unpaid, status: 'PAID', balance: '0.00' }, '50.00'),
    ).toEqual({
      appliedAmount: '0.00',
      creditAmount: '50.00',
      balance: '0.00',
      status: 'PAID',
    });
  });

  it.each(['OVERDUE', 'DISPUTED'] as const)(
    'accepts a partial payment on a %s invoice and keeps its status',
    (status) => {
      expect(allocatePayment({ ...unpaid, status }, '160.00')).toEqual({
        appliedAmount: '160.00',
        creditAmount: '0.00',
        balance: '1000.00',
        status,
      });
    },
  );

  it.each(['OVERDUE', 'DISPUTED'] as const)(
    'marks a %s invoice PAID when the payment completes it',
    (status) => {
      expect(allocatePayment({ ...unpaid, status }, '1160.00').status).toBe(
        'PAID',
      );
    },
  );

  it('rejects a payment on a CANCELLED invoice (R4)', () => {
    expect(() =>
      allocatePayment({ ...unpaid, status: 'CANCELLED' }, '100.00'),
    ).toThrow(InvoiceCancelled);
  });

  it('keeps decimal amounts exact, without binary floating-point drift (R1)', () => {
    // 0.30 - 0.10 is 0.19999999999999998 with JavaScript numbers.
    expect(
      allocatePayment({ ...unpaid, total: '0.30', balance: '0.30' }, '0.10'),
    ).toEqual({
      appliedAmount: '0.10',
      creditAmount: '0.00',
      balance: '0.20',
      status: 'PENDING',
    });
  });

  it('keeps the largest supported amount exact', () => {
    const largest = '9999999999999.99';

    expect(
      allocatePayment({ ...unpaid, total: largest, balance: largest }, largest),
    ).toEqual({
      appliedAmount: largest,
      creditAmount: '0.00',
      balance: '0.00',
      status: 'PAID',
    });
  });
});
