import { IsString, IsUrl, Matches, ValidateIf } from 'class-validator';

const POSITIVE_MONEY = /^(?!0+\.00$)\d+\.\d{2}$/;

export class CreatePaymentDto {
  @IsString()
  @Matches(POSITIVE_MONEY, {
    message: 'amount must be a decimal string greater than zero, like 1160.00',
  })
  amount: string;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsUrl({ require_protocol: true })
  proofUrl?: string;
}
