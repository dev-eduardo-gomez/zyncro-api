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

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoiceUseCase: GetInvoiceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.createInvoiceUseCase.execute(createInvoiceDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findById(@Param('id') id: string) {
    return this.getInvoiceUseCase.execute(id);
  }
}
