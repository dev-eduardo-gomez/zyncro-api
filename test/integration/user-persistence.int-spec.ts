import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile();

describe('User persistence', () => {
  let prisma: PrismaClient;
  const emailPrefix = `test-${Date.now()}`;
  const passwordHash = 'not-a-real-hash';
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
        await prisma.user.deleteMany({
          where: { email: { startsWith: emailPrefix } },
        });
      }
    } finally {
      await prisma?.$disconnect();
    }
  });

  it('assigns the MAKER role when none is given', async () => {
    const user = await prisma.user.create({
      data: { email: `${emailPrefix}-default@users.int`, passwordHash },
    });

    expect(user.role).toBe('MAKER');
  });

  it('rejects a second user with the same email', async () => {
    const email = `${emailPrefix}-duplicate@users.int`;

    await prisma.user.create({ data: { email, passwordHash } });

    await expect(
      prisma.user.create({ data: { email, passwordHash } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a role outside MAKER, CHECKER and ADMIN at the database level', async () => {
    const email = `${emailPrefix}-unknown-role@users.int`;

    await expect(
      prisma.$executeRaw`
        INSERT INTO users (id, email, password_hash, role, updated_at)
        VALUES (gen_random_uuid(), ${email}, ${passwordHash}, 'ROOT', now())
      `,
    ).rejects.toThrow(/invalid input value for enum/);
  });

  it('stores the password only as a hash column', async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    const columnNames = columns.map((column) => column.column_name);

    expect(columnNames).toContain('password_hash');
    expect(columnNames).not.toContain('password');
  });
});
