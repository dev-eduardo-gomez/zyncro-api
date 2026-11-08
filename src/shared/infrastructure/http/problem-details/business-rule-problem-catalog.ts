import { HttpStatus } from '@nestjs/common';
import { PROBLEM_TYPE_BASE_URI } from './problem-details.js';

export interface BusinessRuleProblem {
  type: string;
  title: string;
  status: number;
}

type CatalogEntry = Omit<BusinessRuleProblem, 'type'>;

// Codes that need a status or title other than the fallback. Register a code
// here when its domain rule is introduced.
const CATALOG: Readonly<Record<string, CatalogEntry>> = {
  'maker-checker-violation': {
    title: 'Maker-checker rule violated',
    status: HttpStatus.FORBIDDEN,
  },
  'customer-duplicate-tax-id': {
    title: 'Duplicate tax id',
    status: HttpStatus.CONFLICT,
  },
};

const FALLBACK: CatalogEntry = {
  title: 'Business rule violated',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
};

export const toBusinessRuleProblem = (code: string): BusinessRuleProblem => ({
  type: `${PROBLEM_TYPE_BASE_URI}/business-rule/${code}`,
  ...(Object.hasOwn(CATALOG, code) ? CATALOG[code] : FALLBACK),
});
