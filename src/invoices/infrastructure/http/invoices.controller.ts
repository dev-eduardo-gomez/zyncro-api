import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateInvoiceUseCase } from '../../application/create-invoice.use-case.js';
import { GetInvoiceUseCase } from '../../application/get-invoice.use-case.js';
import { CreateInvoiceDto } from './create-invoice.dto.js';
import { RegisterPaymentUseCase } from '../../application/register-payment.use-case.js';
import { ListInvoicePaymentsUseCase } from '../../application/list-invoice-payments.use-case.js';
import { CreatePaymentDto } from './create-payment.dto.js';
import { ListInvoicesUseCase } from '../../application/list-invoices.use-case.js';
import { ListInvoicesQueryDto } from './list-invoices-query.dto.js';
import { decodeInvoiceCursor, encodeInvoiceCursor } from './invoice-cursor.js';

const DEFAULT_PAGE_SIZE = 20;

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoiceUseCase: GetInvoiceUseCase,
    private readonly registerPaymentUseCase: RegisterPaymentUseCase,
    private readonly listInvoicePaymentsUseCase: ListInvoicePaymentsUseCase,
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.createInvoiceUseCase.execute(createInvoiceDto);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  registerPayment(
    @Param('id') id: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.registerPaymentUseCase.execute(id, {
      ...createPaymentDto,
      proofUrl: createPaymentDto.proofUrl ?? null,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Query() query: ListInvoicesQueryDto) {
    const page = await this.listInvoicesUseCase.execute({
      filter: {
        status: query.status,
        customerId: query.customerId,
        dueDateFrom: query.dueDateFrom,
        dueDateTo: query.dueDateTo,
        minTotal: query.minAmount,
        maxTotal: query.maxAmount,
      },
      afterFolio:
        query.cursor === undefined ? null : decodeInvoiceCursor(query.cursor),
      limit:
        query.limit === undefined ? DEFAULT_PAGE_SIZE : Number(query.limit),
    });

    return {
      items: page.items,
      nextCursor:
        page.nextFolio === null ? null : encodeInvoiceCursor(page.nextFolio),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findById(@Param('id') id: string) {
    return this.getInvoiceUseCase.execute(id);
  }

  @Get(':id/payments')
  @HttpCode(HttpStatus.OK)
  findByInvoiceId(@Param('id') id: string) {
    return this.listInvoicePaymentsUseCase.execute(id);
  }
}
