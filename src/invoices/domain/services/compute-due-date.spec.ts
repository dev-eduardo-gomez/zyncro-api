import { computeDueDate } from './compute-due-date.js';

describe('computeDueDate', () => {
  it('adds the credit days to the issue date', () => {
    expect(computeDueDate(new Date('2026-11-03T15:00:00Z'), 30)).toBe(
      '2026-12-03',
    );
  });

  it('returns the issue date itself for zero credit days', () => {
    expect(computeDueDate(new Date('2026-11-03T15:00:00Z'), 0)).toBe(
      '2026-11-03',
    );
  });

  it('rolls over into the next year', () => {
    expect(computeDueDate(new Date('2026-12-20T10:00:00Z'), 15)).toBe(
      '2027-01-04',
    );
  });

  it('lands on February 29 in a leap year', () => {
    expect(computeDueDate(new Date('2028-02-28T10:00:00Z'), 1)).toBe(
      '2028-02-29',
    );
  });

  it('uses the UTC calendar date of the issue instant', () => {
    expect(computeDueDate(new Date('2026-11-03T23:30:00-06:00'), 0)).toBe(
      '2026-11-04',
    );
  });
});
