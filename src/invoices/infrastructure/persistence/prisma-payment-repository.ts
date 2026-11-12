import { Injectable } from '@nestjs/common';
import {
  AllocatePayment,
  PaymentRepository,
} from '../../domain/ports/payment-repository.js';
import { PrismaService } from '../../../shared/infrastructure/persistence/prisma/prisma.service.js';
import type { NewPayment, Payment } from '../../domain/models/payment.js';
import type { InvoiceStatus } from '../../domain/models/invoice.js';
import { Prisma } from '../../../generated/prisma/client.js';

type InvoiceAllocate = {
  status: InvoiceStatus;
  total: Prisma.Decimal;
  balance: Prisma.Decimal;
  customer_id: string;
};

@Injectable()
export class PrismaPaymentRepository extends PaymentRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async register(
    invoiceId: string,
    payment: NewPayment,
    allocate: AllocatePayment,
  ): Promise<Payment | null> {
    return await this.prismaService.$transaction(
      async (tx): Promise<Payment | null> => {
        const invoices = await tx.$queryRaw<
          InvoiceAllocate[]
        >`SELECT status, total, balance, customer_id FROM "invoices" WHERE id = ${invoiceId} FOR UPDATE`;

        if (invoices.length === 0) return null;

        const invoice = invoices[0];

        const allocatePayment = allocate({
          status: invoice.status,
          total: invoice.total.toFixed(2),
          balance: invoice.balance.toFixed(2),
        });

        const created = await tx.payment.create({
          data: {
            ...payment,
            invoiceId: invoiceId,
            appliedAmount: allocatePayment.appliedAmount,
            creditAmount: allocatePayment.creditAmount,
          },
        });

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            balance: allocatePayment.balance,
            status: allocatePayment.status,
          },
        });

        await tx.customer.update({
          where: { id: invoice.customer_id },
          data: {
            creditBalance: { increment: allocatePayment.creditAmount },
          },
        });

        return {
          ...created,
          amount: created.amount.toFixed(2),
          appliedAmount: created.appliedAmount.toFixed(2),
          creditAmount: created.creditAmount.toFixed(2),
        };
      },
    );
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment[] | null> {
    const invoice = await this.prismaService.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (invoice === null) return null;

    return invoice.payments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount.toFixed(2),
      appliedAmount: payment.appliedAmount.toFixed(2),
      creditAmount: payment.creditAmount.toFixed(2),
      proofUrl: payment.proofUrl,
      createdAt: payment.createdAt,
    }));
  }
}
