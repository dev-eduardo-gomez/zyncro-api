import { deriveInvoiceStatus } from './derive-invoice-status.js';
describe('deriveInvoiceStatus', () => {
  const today = '2026-11-03';

  it('is DUE_SOON for a pending invoice due in 5 days', () => {
    expect(
      deriveInvoiceStatus({ status: 'PENDING', dueDate: '2026-11-08' }, today),
    ).toBe('DUE_SOON');
  });

  it('is DUE_SOON for a pending invoice due today', () => {
    expect(
      deriveInvoiceStatus({ status: 'PENDING', dueDate: today }, today),
    ).toBe('DUE_SOON');
  });

  it('is DUE_SOON when the 5-day window crosses into the next month', () => {
    expect(
      deriveInvoiceStatus(
        { status: 'PENDING', dueDate: '2026-12-03' },
        '2026-11-28',
      ),
    ).toBe('DUE_SOON');
  });

  it('is null for a pending invoice due in 6 days', () => {
    expect(
      deriveInvoiceStatus({ status: 'PENDING', dueDate: '2026-11-09' }, today),
    ).toBeNull();
  });

  it('is null for a pending invoice already past its due date', () => {
    expect(
      deriveInvoiceStatus({ status: 'PENDING', dueDate: '2026-11-02' }, today),
    ).toBeNull();
  });

  it('is null for an invoice that is not pending', () => {
    expect(
      deriveInvoiceStatus({ status: 'PAID', dueDate: '2026-11-04' }, today),
    ).toBeNull();
  });
});
