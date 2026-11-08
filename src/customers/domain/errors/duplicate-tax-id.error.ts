import { BusinessRuleViolation } from '../../../shared/domain/errors/business-rule-violation.js';

export class DuplicateTaxId extends BusinessRuleViolation {
  constructor(taxId: string) {
    super(
      'customer-duplicate-tax-id',
      `A customer with tax id "${taxId}" already exists.`,
    );
  }
}
