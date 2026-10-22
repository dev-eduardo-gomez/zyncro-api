const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export abstract class BusinessRuleViolation extends Error {
  protected constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    if (!KEBAB_CASE.test(code)) {
      throw new Error(`Business rule code must be kebab-case, got "${code}"`);
    }
  }
}
