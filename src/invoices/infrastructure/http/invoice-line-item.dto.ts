import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const MONEY = /^\d+\.\d{2}$/;

export class InvoiceLineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity: number;

  @IsString()
  @Matches(MONEY, { message: 'unitPrice must be a decimal string like 1000.00' })
  unitPrice: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  taxRate: number;
}
