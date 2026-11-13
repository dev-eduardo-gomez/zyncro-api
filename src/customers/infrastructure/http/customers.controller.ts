import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateCustomerUseCase } from '../../application/create-customer.use-case.js';
import { GetCustomerUseCase } from '../../application/get-customer.use-case.js';
import { ListCustomersUseCase } from '../../application/list-customers.use-case.js';
import { UpdateCustomerUseCase } from '../../application/update-customer.use-case.js';
import { CreateCustomerDto } from './create-customer.dto.js';
import { UpdateCustomerDto } from './update-customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.createCustomerUseCase.execute(createCustomerDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.listCustomersUseCase.execute();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findById(@Param('id') id: string) {
    return this.getCustomerUseCase.execute(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.updateCustomerUseCase.execute(id, updateCustomerDto);
  }
}
