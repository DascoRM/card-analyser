import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkDatabaseConnection(): Promise<{ connected: boolean; users: number }> {
    try {
      const userCount = await this.prisma.user.count();
      return { connected: true, users: userCount };
    } catch (error) {
      console.error('Database connection error:', error);
      return { connected: false, users: 0 };
    }
  }
}
