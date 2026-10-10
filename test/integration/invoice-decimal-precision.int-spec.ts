import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

process.loadEnvFile();

describe('Invoice amount persistence', () => {
  let prisma: PrismaClient;
  const taxId = `TEST-${Date.now()}`;
  let isDatabaseReady = false;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

    await prisma.$queryRaw`SELECT 1`;
    isDatabaseReady = true;
  });

  afterAll(async () => {
    try {
      if (isDatabaseReady) {
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
      }
    } finally {
      await prisma?.$disconnect();
    }
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

  it('sums amounts in the database without floating-point drift', async () => {
    const sumTaxId = `${taxId}-sum`;

    const customerNew = await prisma.customer.create({
      data: {
        taxId: sumTaxId,
        contactEmail: 'test3@test.float',
      },
    });

    await prisma.invoice.createMany({
      data: Array.from({ length: 10 }, () => ({
        customerId: customerNew.id,
        totalAmount: '0.10',
      })),
    });

    const invoicesSum = await prisma.invoice.aggregate({
      where: { customerId: customerNew.id },
      _sum: { totalAmount: true },
    });

    expect(invoicesSum._sum.totalAmount?.toString()).toBe('1');
  });

  it('rounds amounts beyond two decimals half away from zero', async () => {
    const roundTaxId = `${taxId}-round`;

    const customerNew = await prisma.customer.create({
      data: {
        taxId: roundTaxId,
        contactEmail: 'test4@test.round',
      },
    });

    const invoiceNew = await prisma.invoice.create({
      data: {
        customerId: customerNew.id,
        totalAmount: '10.005',
      },
    });

    expect(invoiceNew.totalAmount.toString()).toBe('10.01');
  });

  it('stores the maximum amount without losing precision', async () => {
    const maxTaxId = `${taxId}-max`;

    const customerNew = await prisma.customer.create({
      data: {
        taxId: maxTaxId,
        contactEmail: 'test5@test.max',
      },
    });

    const invoiceNew = await prisma.invoice.create({
      data: {
        customerId: customerNew.id,
        totalAmount: '9999999999999.99',
      },
    });

    expect(invoiceNew.totalAmount.toString()).toBe('9999999999999.99');
  });

  it('rejects amounts with more than 13 integer digits', async () => {
    const overflowTaxId = `${taxId}-overflow`;

    const customerNew = await prisma.customer.create({
      data: {
        taxId: overflowTaxId,
        contactEmail: 'test6@test.overflow',
      },
    });

    await expect(
      prisma.invoice.create({
        data: {
          customerId: customerNew.id,
          totalAmount: '1'.padEnd(14, '0'),
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2020',
    });
  });
});
