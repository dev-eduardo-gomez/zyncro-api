import { IsString, IsUrl, Matches, ValidateIf } from 'class-validator';

// Money as a decimal string (R1), strictly greater than zero: `0.00` is a
// validation error, not a business rule (L45).
const POSITIVE_MONEY = /^(?!0+\.00$)\d+\.\d{2}$/;

export class CreatePaymentDto {
  @IsString()
  @Matches(POSITIVE_MONEY, {
    message: 'amount must be a decimal string greater than zero, like 1160.00',
  })
  amount: string;

  // Optional, but not nullable: only an absent field skips validation, so an
  // explicit `null` is still a 400 (`@IsOptional` would let it through).
  @ValidateIf((_dto, value) => value !== undefined)
  @IsUrl({ require_protocol: true })
  proofUrl?: string;
}
