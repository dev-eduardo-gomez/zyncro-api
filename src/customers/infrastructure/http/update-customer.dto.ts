import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  creditDays?: number;
}
