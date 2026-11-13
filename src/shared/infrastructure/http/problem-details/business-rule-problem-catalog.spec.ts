import { toBusinessRuleProblem } from './business-rule-problem-catalog.js';

describe('toBusinessRuleProblem', () => {
  it('derives the type URI from the business rule code', () => {
    const problem = toBusinessRuleProblem('maker-checker-violation');

    expect(problem.type).toBe(
      'https://github.com/dev-eduardo-gomez/zyncro-api/blob/main/docs/errors.md#maker-checker-violation',
    );
  });

  it('uses the catalog status and title for a mapped code', () => {
    const problem = toBusinessRuleProblem('maker-checker-violation');

    expect(problem).toEqual({
      type: 'https://github.com/dev-eduardo-gomez/zyncro-api/blob/main/docs/errors.md#maker-checker-violation',
      title: 'Maker-checker rule violated',
      status: 403,
    });
  });

  it('falls back to 422 and a generic title for an unmapped code', () => {
    const problem = toBusinessRuleProblem('credit-limit-exceeded');

    expect(problem).toEqual({
      type: 'https://github.com/dev-eduardo-gomez/zyncro-api/blob/main/docs/errors.md#credit-limit-exceeded',
      title: 'Business rule violated',
      status: 422,
    });
  });

  it('ignores inherited object keys when looking up the catalog', () => {
    expect(toBusinessRuleProblem('constructor').status).toBe(422);
  });

  it('builds a plain URI with no Markdown characters', () => {
    const { type } = toBusinessRuleProblem('credit-limit-exceeded');

    expect(() => new URL(type)).not.toThrow();
    expect(type).not.toMatch(/[\s*_`[\]()<>]/);
  });
});
