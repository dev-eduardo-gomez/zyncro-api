import { Role as PrismaRole } from '../../../generated/prisma/enums.js';
import { Role } from '../../domain/models/role.js';

describe('Prisma Role enum', () => {
  it('holds the same values as the domain Role', () => {
    const prismaRoles = Object.values(PrismaRole).sort();
    const domainRoles = Object.values(Role).sort();

    expect(prismaRoles).toEqual(domainRoles);
  });
});
