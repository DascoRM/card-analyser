import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to the database', async () => {
    await expect(service.$connect()).resolves.not.toThrow();
  });

  it('should disconnect from the database', async () => {
    await service.$connect();
    await expect(service.$disconnect()).resolves.not.toThrow();
  });

  describe('cleanDatabase', () => {
    it('should throw error in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await expect(service.cleanDatabase()).rejects.toThrow(
        'Cannot clean database in production',
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should clean database in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await expect(service.cleanDatabase()).resolves.not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
