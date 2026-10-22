import { BusinessRuleViolation } from './business-rule-violation.js';

class TestRuleViolation extends BusinessRuleViolation {
  constructor(code: string) {
    super(code, 'A test business rule was violated');
  }
}

describe('BusinessRuleViolation', () => {
  it('exposes its code and message', () => {
    const violation = new TestRuleViolation('maker-checker-violation');

    expect(violation.code).toBe('maker-checker-violation');
    expect(violation.message).toBe('A test business rule was violated');
  });

  it('is an Error that can be recognized as a business rule violation', () => {
    const violation = new TestRuleViolation('maker-checker-violation');

    expect(violation).toBeInstanceOf(Error);
    expect(violation).toBeInstanceOf(BusinessRuleViolation);
  });

  it.each(['overdue', 'credit-limit-exceeded', 'rule-2fa'])(
    'accepts the kebab-case code "%s"',
    (code) => {
      expect(new TestRuleViolation(code).code).toBe(code);
    },
  );

  it.each([
    ['empty', ''],
    ['uppercase', 'Maker-Checker'],
    ['inner space', 'maker checker'],
    ['surrounding space', ' maker-checker '],
    ['leading hyphen', '-maker-checker'],
    ['trailing hyphen', 'maker-checker-'],
    ['consecutive hyphens', 'maker--checker'],
    ['underscore', 'maker_checker'],
    ['slash', 'maker/checker'],
    ['query', 'maker?checker'],
    ['fragment', 'maker#checker'],
    ['markdown emphasis', '*maker-checker*'],
    ['markdown code', '`maker-checker`'],
    ['markdown link', '[maker](checker)'],
    ['accented letter', 'línea-de-crédito'],
  ])('rejects a code with %s: "%s"', (_case, code) => {
    expect(() => new TestRuleViolation(code)).toThrow(
      `Business rule code must be kebab-case, got "${code}"`,
    );
  });
});
