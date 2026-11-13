import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { InvoiceLineItemDto } from './invoice-line-item.dto.js';

export class CreateInvoiceDto {
  @IsUUID()
  customerId: string;

  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a three-letter ISO 4217 code',
  })
  currency: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];
}
