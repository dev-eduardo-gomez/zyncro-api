import { ValidationError } from 'class-validator';
import {
  InvalidField,
  RequestValidationException,
} from './request-validation.exception.js';

const toInvalidFields = (
  error: ValidationError,
  parentPath?: string,
): InvalidField[] => {
  const field = parentPath ? `${parentPath}.${error.property}` : error.property;
  const own = Object.values(error.constraints ?? {}).map((detail) => ({
    field,
    detail,
  }));
  const nested = (error.children ?? []).flatMap((child) =>
    toInvalidFields(child, field),
  );
  return [...own, ...nested];
};

export const validationExceptionFactory = (
  errors: ValidationError[],
): RequestValidationException =>
  new RequestValidationException(
    errors.flatMap((error) => toInvalidFields(error)),
  );
