import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { PrismaService } from '../../src/shared/infrastructure/persistence/prisma/prisma.service.js';
import { PrismaUserCredentialsRepository } from '../../src/auth/infrastructure/persistence/prisma-user-credentials-repository.js';
import { Role } from '../../src/auth/domain/role.js';

if (existsSync('.env')) process.loadEnvFile();

describe('PrismaUserCredentialsRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaUserCredentialsRepository;
  const emailPrefix = `test-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    repository = new PrismaUserCredentialsRepository(prisma);

    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: emailPrefix } },
    });
    await prisma.$disconnect();
  });

  it('returns the user mapped to the domain shape when the email exists', async () => {
    const email = `${emailPrefix}-found@users.int`;
    const created = await prisma.user.create({
      data: { email, passwordHash: 'not-a-real-hash', role: 'CHECKER' },
    });

    const user = await repository.findByEmail(email);

    expect(user).toEqual({
      id: created.id,
      email,
      passwordHash: 'not-a-real-hash',
      role: Role.CHECKER,
    });
  });

  it('returns null when no user matches the email', async () => {
    const user = await repository.findByEmail(
      `${emailPrefix}-missing@users.int`,
    );

    expect(user).toBeNull();
  });
});
