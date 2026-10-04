import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';

process.loadEnvFile();

describe('Invoice amount persistence', () => {
  let prisma: PrismaClient;
  const taxId = `TEST-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({
      where: {
        customer: { taxId: { startsWith: taxId } },
      },
    });

    await prisma.customer.deleteMany({
      where: {
        taxId: { startsWith: taxId },
      },
    });

    await prisma.$disconnect();
  });

  it('stores and reads back 0.1 + 0.2 as exactly 0.30', async () => {
    const newCustomer = await prisma.customer.create({
      data: {
        taxId: `${taxId}-decimal`,
        contactEmail: 'test@test.int',
      },
    });

    const newInvoice = await prisma.invoice.create({
      data: {
        customerId: newCustomer.id,
        totalAmount: new Prisma.Decimal('0.1').plus('0.2'),
      },
    });

    const storedInvoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: newInvoice.id },
    });

    expect(storedInvoice.totalAmount.toFixed(2)).toBe('0.30');
  });

  it('rejects a second customer with the same taxId', async () => {
    const duplicatedTaxId = `${taxId}-duplicate`;

    await prisma.customer.create({
      data: {
        taxId: duplicatedTaxId,
        contactEmail: 'test2@test.int',
      },
    });

    await expect(
      prisma.customer.create({
        data: {
          taxId: duplicatedTaxId,
          contactEmail: 'test2@test.int',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
