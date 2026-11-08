import {
  Body,
  Controller,
  Get,
  INestApplication,
  Logger,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsIn, IsPositive } from 'class-validator';
import { existsSync } from 'node:fs';
import request from 'supertest';
import { Public } from '../src/auth/infrastructure/security/public.decorator.js';
import { AppModule } from './../src/app.module.js';
import { BusinessRuleViolation } from './../src/shared/domain/errors/business-rule-violation.js';

if (existsSync('.env')) process.loadEnvFile();

const PROBLEM_JSON = /^application\/problem\+json/;

class MakerCheckerViolation extends BusinessRuleViolation {
  constructor() {
    super(
      'maker-checker-violation',
      'The maker cannot approve their own payment',
    );
  }
}

class CreateInvoiceDto {
  @IsPositive()
  amount: number;

  @IsIn(['MXN', 'USD'])
  currency: string;
}

// Public: these routes exercise Problem Details, not authentication.
@Public()
@Controller('e2e-probe')
class ProbeController {
  @Post('invoices')
  createInvoice(@Body() invoice: CreateInvoiceDto) {
    return invoice;
  }

  @Get('maker-checker')
  makerChecker() {
    throw new MakerCheckerViolation();
  }

  @Get('crash')
  crash() {
    throw new Error('relation "invoices" does not exist');
  }
}

describe('Problem Details (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it('answers an unknown route with a 404 Problem Details', async () => {
    const response = await request(app.getHttpServer()).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/does-not-exist',
    });
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  it('answers an invalid body with a validation Problem Details', async () => {
    const response = await request(app.getHttpServer())
      .post('/e2e-probe/invoices')
      .send({ amount: -5, currency: 'EUR' });

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'https://cobrix.io/errors/validation',
      status: 400,
      instance: '/e2e-probe/invoices',
    });
    expect(response.body.errors).toEqual([
      { field: 'amount', detail: 'amount must be a positive number' },
      {
        field: 'currency',
        detail: 'currency must be one of the following values: MXN, USD',
      },
    ]);
  });

  it('lets a valid body reach the controller', async () => {
    const response = await request(app.getHttpServer())
      .post('/e2e-probe/invoices')
      .send({ amount: 100, currency: 'MXN' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ amount: 100, currency: 'MXN' });
  });

  it('answers a business rule violation with its Problem Details', async () => {
    const response = await request(app.getHttpServer()).get(
      '/e2e-probe/maker-checker',
    );

    expect(response.status).toBe(403);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'https://cobrix.io/errors/business-rule/maker-checker-violation',
      status: 403,
      detail: 'The maker cannot approve their own payment',
    });
  });

  it('answers an unexpected error with a generic 500 and logs it', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const response = await request(app.getHttpServer()).get('/e2e-probe/crash');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.detail).toBe('An unexpected error occurred.');
    expect(response.text).not.toContain('relation "invoices"');
    expect(logError).toHaveBeenCalledWith(
      'Unhandled exception on GET /e2e-probe/crash',
      expect.stringContaining('relation "invoices" does not exist'),
    );
  });
});
