import { Injectable, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module.js';

@Injectable()
class InvoiceRepositoryStub {
  constructor(public readonly prismaService: PrismaService) {}
}

@Module({
  providers: [InvoiceRepositoryStub],
})
class FeatureModuleStub {}

describe('PrismaModule', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/dummy');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('makes PrismaService injectable in modules that do not import it', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, FeatureModuleStub],
    }).compile();

    const repository = moduleRef.get(InvoiceRepositoryStub);

    expect(repository.prismaService).toBe(moduleRef.get(PrismaService));
  });
});
