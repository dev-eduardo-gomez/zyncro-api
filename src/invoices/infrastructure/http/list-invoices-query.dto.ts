import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { InvoiceStatus } from '../../domain/models/invoice.js';
import { IsInvoiceCursor } from './invoice-cursor.js';

const INVOICE_STATUSES = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'DISPUTED',
] as const satisfies readonly InvoiceStatus[];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+\.\d{2}$/;
const DATE_MESSAGE = '$property must be a calendar date like 2026-11-30';
const MONEY_MESSAGE = '$property must be a decimal string like 1160.00';

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @Matches(DATE, { message: DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE })
  dueDateFrom?: string;

  @IsOptional()
  @Matches(DATE, { message: DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE })
  dueDateTo?: string;

  @IsOptional()
  @Matches(MONEY, { message: MONEY_MESSAGE })
  minAmount?: string;

  @IsOptional()
  @Matches(MONEY, { message: MONEY_MESSAGE })
  maxAmount?: string;

  @IsOptional()
  @IsInvoiceCursor()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
