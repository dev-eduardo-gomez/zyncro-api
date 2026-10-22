import {
  Controller,
  Get,
  INestApplication,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BusinessRuleViolation } from '../../../domain/errors/business-rule-violation.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import { RequestValidationException } from './request-validation.exception.js';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const INTERNAL_SECRET = 'postgres://admin:s3cret@db:5432/cobrix';

class MakerCheckerViolation extends BusinessRuleViolation {
  constructor() {
    super(
      'maker-checker-violation',
      'The maker cannot approve their own payment',
    );
  }
}

class CreditLimitExceeded extends BusinessRuleViolation {
  constructor() {
    super('credit-limit-exceeded', 'The customer exceeded the credit limit');
  }
}

@Controller('probe')
class ProbeController {
  @Get('maker-checker')
  makerChecker() {
    throw new MakerCheckerViolation();
  }

  @Get('credit-limit')
  creditLimit() {
    throw new CreditLimitExceeded();
  }

  @Get('missing-invoice')
  missingInvoice() {
    throw new NotFoundException('Invoice 42 was not found');
  }

  @Get('crash')
  crash() {
    throw new Error(`Connection refused: ${INTERNAL_SECRET}`);
  }

  @Get('throw-string')
  throwString() {
    throw INTERNAL_SECRET;
  }

  @Get('unavailable')
  unavailable() {
    throw new ServiceUnavailableException(`Pool exhausted: ${INTERNAL_SECRET}`);
  }

  @Get('invalid-request')
  invalidRequest() {
    throw new RequestValidationException([
      { field: 'amount', detail: 'amount must be positive' },
      { field: 'customer.taxId', detail: 'taxId should not be empty' },
    ]);
  }
}

describe('ProblemDetailsFilter', () => {
  let app: INestApplication;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('answers a mapped business rule violation with its catalog type, status and title', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/maker-checker',
    );

    expect(response.status).toBe(403);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toEqual({
      type: 'https://cobrix.io/errors/business-rule/maker-checker-violation',
      title: 'Maker-checker rule violated',
      status: 403,
      detail: 'The maker cannot approve their own payment',
      instance: '/probe/maker-checker',
      timestamp: NOW.toISOString(),
    });
  });

  it('answers an unmapped business rule violation with the fallback status', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/credit-limit',
    );

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      type: 'https://cobrix.io/errors/business-rule/credit-limit-exceeded',
      title: 'Business rule violated',
      status: 422,
      detail: 'The customer exceeded the credit limit',
    });
  });

  it('answers a request validation failure with the invalid fields', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/invalid-request',
    );

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toEqual({
      type: 'https://cobrix.io/errors/validation',
      title: 'Request validation failed',
      status: 400,
      detail: 'The request contains invalid fields.',
      instance: '/probe/invalid-request',
      timestamp: NOW.toISOString(),
      errors: [
        { field: 'amount', detail: 'amount must be positive' },
        { field: 'customer.taxId', detail: 'taxId should not be empty' },
      ],
    });
  });

  it('answers an HttpException with about:blank and the HTTP status phrase', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/missing-invoice',
    );

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Invoice 42 was not found',
      instance: '/probe/missing-invoice',
      timestamp: NOW.toISOString(),
    });
  });

  it('answers an unknown route with a 404 Problem Details', async () => {
    const response = await request(app.getHttpServer()).get('/nowhere?page=2');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/nowhere?page=2',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('answers an unexpected error with a generic 500 and logs it', async () => {
    const response = await request(app.getHttpServer()).get('/probe/crash');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: '/probe/crash',
      timestamp: NOW.toISOString(),
    });
    expect(response.text).not.toContain(INTERNAL_SECRET);
    expect(response.text).not.toContain('at ProbeController');
    expect(logError).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      'Unhandled exception on GET /probe/crash',
      expect.stringContaining(INTERNAL_SECRET),
    );
  });

  it('answers a thrown non-Error value with a generic 500 and logs it', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/throw-string',
    );

    expect(response.status).toBe(500);
    expect(response.body.detail).toBe('An unexpected error occurred.');
    expect(response.text).not.toContain(INTERNAL_SECRET);
    expect(logError).toHaveBeenCalledWith(
      'Unhandled exception on GET /probe/throw-string',
      INTERNAL_SECRET,
    );
  });

  it('hides the message of a 5xx HttpException and logs it', async () => {
    const response = await request(app.getHttpServer()).get(
      '/probe/unavailable',
    );

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'An unexpected error occurred.',
    });
    expect(response.text).not.toContain(INTERNAL_SECRET);
    expect(logError).toHaveBeenCalledOnce();
  });
});
