import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { Invoice, NewInvoice } from '../../domain/models/invoice.js';
import { InvoiceRepository } from '../../domain/ports/invoice-repository.js';
import { PrismaService } from '../../../shared/infrastructure/persistence/prisma/prisma.service.js';

type InvoiceWithLineItems = Prisma.InvoiceGetPayload<{
  include: { lineItems: true };
}>;

const toDomain = (row: InvoiceWithLineItems): Invoice => {
  return {
    id: row.id,
    folio: row.folio,
    customerId: row.customerId,
    currency: row.currency,
    lineItems: row.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity.toNumber(),
      unitPrice: item.unitPrice.toFixed(2),
      taxRate: item.taxRate.toNumber(),
      lineTotal: item.lineTotal.toFixed(2),
    })),
    subtotal: row.subtotal.toFixed(2),
    tax: row.tax.toFixed(2),
    total: row.total.toFixed(2),
    balance: row.balance.toFixed(2),
    status: row.status,
    dueDate: row.dueDate.toISOString().slice(0, 10),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

@Injectable()
export class PrismaInvoiceRepository extends InvoiceRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async create(invoice: NewInvoice): Promise<Invoice> {
    const created = await this.prismaService.invoice.create({
      data: {
        customerId: invoice.customerId,
        currency: invoice.currency,
        dueDate: new Date(invoice.dueDate),
        lineItems: {
          create: invoice.lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal,
            position: index,
          })),
        },
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        balance: invoice.total,
        total: invoice.total,
      },
      include: {
        lineItems: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    return toDomain(created);
  }

  async findById(id: string): Promise<Invoice | null> {
    const invoice = await this.prismaService.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (invoice === null) return null;

    return toDomain(invoice);
  }
}
