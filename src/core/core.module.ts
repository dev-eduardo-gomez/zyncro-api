import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ProblemDetailsFilter } from '../shared/infrastructure/http/problem-details/problem-details.filter.js';
import { validationExceptionFactory } from '../shared/infrastructure/http/problem-details/validation-exception.factory.js';

@Module({
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
    },
  ],
})
export class CoreModule {}
