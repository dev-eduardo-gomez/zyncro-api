import { BadRequestException } from '@nestjs/common';

export interface InvalidField {
  field: string;
  detail: string;
}

export class RequestValidationException extends BadRequestException {
  constructor(readonly errors: readonly InvalidField[]) {
    super('The request contains invalid fields.');
  }
}
