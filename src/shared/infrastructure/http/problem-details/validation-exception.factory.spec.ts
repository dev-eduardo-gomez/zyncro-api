import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from './request-validation.exception.js';
import { validationExceptionFactory } from './validation-exception.factory.js';

const validationError = (
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError =>
  Object.assign(new ValidationError(), { property, constraints, children });

describe('validationExceptionFactory', () => {
  it('returns a 400 RequestValidationException', () => {
    const exception = validationExceptionFactory([
      validationError('amount', { isPositive: 'amount must be positive' }),
    ]);

    expect(exception).toBeInstanceOf(RequestValidationException);
    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
  });

  it('lists one invalid field entry per violated constraint', () => {
    const exception = validationExceptionFactory([
      validationError('amount', {
        isNumber: 'amount must be a number',
        isPositive: 'amount must be positive',
      }),
      validationError('currency', { isIn: 'currency must be MXN or USD' }),
    ]);

    expect(exception.errors).toEqual([
      { field: 'amount', detail: 'amount must be a number' },
      { field: 'amount', detail: 'amount must be positive' },
      { field: 'currency', detail: 'currency must be MXN or USD' },
    ]);
  });

  it('builds a dotted path for nested objects and array items', () => {
    const exception = validationExceptionFactory([
      validationError('customer', undefined, [
        validationError('taxId', { isNotEmpty: 'taxId should not be empty' }),
      ]),
      validationError('items', undefined, [
        validationError('0', undefined, [
          validationError('sku', { isString: 'sku must be a string' }),
        ]),
      ]),
    ]);

    expect(exception.errors).toEqual([
      { field: 'customer.taxId', detail: 'taxId should not be empty' },
      { field: 'items.0.sku', detail: 'sku must be a string' },
    ]);
  });
});
