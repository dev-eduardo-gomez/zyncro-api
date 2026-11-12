import { deriveInvoiceStatus } from './derive-invoice-status.js';
describe('deriveInvoiceStatus', () => {
  const today = '2026-11-03';
  const unpaid = { total: '1160.00', balance: '1160.00' };
  const partiallyPaid = { total: '1160.00', balance: '760.00' };

  it('is DUE_SOON for a pending invoice due in 5 days', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-11-08', ...unpaid },
        today,
      ),
    ).toBe('DUE_SOON');
  });

  it('is DUE_SOON for a pending invoice due today', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: today, ...unpaid },
        today,
      ),
    ).toBe('DUE_SOON');
  });

  it('is DUE_SOON when the 5-day window crosses into the next month', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-12-03', ...unpaid },
        '2026-11-28',
      ),
    ).toBe('DUE_SOON');
  });

  it('is null for a pending invoice due in 6 days', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-11-09', ...unpaid },
        today,
      ),
    ).toBeNull();
  });

  it('is null for a pending invoice already past its due date', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-11-02', ...unpaid },
        today,
      ),
    ).toBeNull();
  });

  it('is null for a paid invoice', () => {
    expect(
      deriveInvoiceStatus(
        {
          status: 'PAID',
          dueDate: '2026-11-04',
          total: '1160.00',
          balance: '0.00',
        },
        today,
      ),
    ).toBeNull();
  });

  it('is PARTIAL when some but not all of the total has been paid', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-12-03', ...partiallyPaid },
        today,
      ),
    ).toBe('PARTIAL');
  });

  it('is PARTIAL for a partially paid overdue invoice', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'OVERDUE', dueDate: '2026-11-01', ...partiallyPaid },
        today,
      ),
    ).toBe('PARTIAL');
  });

  it('is DUE_SOON when the invoice is both partially paid and due soon', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-11-06', ...partiallyPaid },
        today,
      ),
    ).toBe('DUE_SOON');
  });
});
