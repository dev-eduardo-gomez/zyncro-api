import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CreateInvoiceUseCase } from '../../application/create-invoice.use-case.js';
import { GetInvoiceUseCase } from '../../application/get-invoice.use-case.js';
import { CreateInvoiceDto } from './create-invoice.dto.js';
import { RegisterPaymentUseCase } from '../../application/register-payment.use-case.js';
import { ListInvoicePaymentsUseCase } from '../../application/list-invoice-payments.use-case.js';
import { CreatePaymentDto } from './create-payment.dto.js';
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoiceUseCase: GetInvoiceUseCase,
    private readonly registerPaymentUseCase: RegisterPaymentUseCase,
    private readonly listInvoicePaymentsUseCase: ListInvoicePaymentsUseCase,
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
