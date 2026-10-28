import { Injectable } from '@nestjs/common';
import { UserCredentialsRepository } from '../../domain/user-credentials-repository.js';
import { PrismaService } from '../../../shared/infrastructure/persistence/prisma/prisma.service.js';
import { type User } from '../../domain/user.js';

@Injectable()
export class PrismaUserCredentialsRepository extends UserCredentialsRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (row === null) return null;

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
    };
  }
}
