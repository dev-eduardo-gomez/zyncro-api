import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/dummy');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('connects once when the module initializes', async () => {
    const service = new PrismaService();
    const connect = vi.spyOn(service, '$connect').mockResolvedValue();

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledOnce();
  });

  it('disconnects once when the module is destroyed', async () => {
    const service = new PrismaService();
    const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
