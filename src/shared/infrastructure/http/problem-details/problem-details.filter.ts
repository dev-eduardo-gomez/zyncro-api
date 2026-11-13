import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import { BusinessRuleViolation } from '../../../domain/errors/business-rule-violation.js';
import { toBusinessRuleProblem } from './business-rule-problem-catalog.js';
import {
  DEFAULT_PROBLEM_TYPE,
  Problem,
  PROBLEM_JSON_CONTENT_TYPE,
  PROBLEM_TYPE_BASE_URI,
  ProblemDetails,
} from './problem-details.js';
import { RequestValidationException } from './request-validation.exception.js';

const UNEXPECTED_ERROR_DETAIL = 'An unexpected error occurred.';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const http = host.switchToHttp();
    const request: unknown = http.getRequest();
    const response: unknown = http.getResponse();
    const instance: string = httpAdapter.getRequestUrl(request);

    const problem: ProblemDetails = {
      ...this.toProblem(
        exception,
        httpAdapter.getRequestMethod(request),
        instance,
      ),
      instance,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.setHeader(response, 'Content-Type', PROBLEM_JSON_CONTENT_TYPE);
    httpAdapter.reply(response, problem, problem.status);
  }

  private toProblem(exception: unknown, method: string, url: string): Problem {
    if (exception instanceof BusinessRuleViolation) {
      return {
        ...toBusinessRuleProblem(exception.code),
        detail: exception.message,
      };
    }

    if (exception instanceof RequestValidationException) {
      return {
        type: `${PROBLEM_TYPE_BASE_URI}#validation`,
        title: 'Request validation failed',
        status: exception.getStatus(),
        detail: exception.message,
        errors: exception.errors,
      };
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const title = STATUS_CODES[status] ?? 'Error';

    if (exception instanceof HttpException && status < 500) {
      return {
        type: DEFAULT_PROBLEM_TYPE,
        title,
        status,
        detail: exception.message,
      };
    }

    this.logger.error(
      `Unhandled exception on ${method} ${url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      type: DEFAULT_PROBLEM_TYPE,
      title,
      status,
      detail: UNEXPECTED_ERROR_DETAIL,
    };
  }
}
