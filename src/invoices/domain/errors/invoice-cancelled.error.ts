import { BusinessRuleViolation } from '../../../shared/domain/errors/business-rule-violation.js';

export class InvoiceCancelled extends BusinessRuleViolation {
  constructor() {
    super(
      'invoice-cancelled',
      'Cannot register a payment on a cancelled invoice.',
    );
  }
}
