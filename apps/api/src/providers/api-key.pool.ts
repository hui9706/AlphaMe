import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { SecretsService } from '../secrets.service';

@Injectable()
export class ApiKeyPool {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly secrets: SecretsService) {}

  async next() {
    const key = await this.prisma.apiKey.findFirst({ where: { status: 'ACTIVE', OR: [{ pausedUntil: null }, { pausedUntil: { lt: new Date() } }] }, orderBy: [{ priority: 'asc' }, { lastUsedAt: 'asc' }] });
    if (!key) {
      const token = this.config.get<string>('SEEDREAM_API_KEY');
      if (token) return { id: null, token };
      throw new ServiceUnavailableException('No active Seedream API key');
    }
    await this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return { id: key.id, token: this.secrets.decrypt(key.encryptedValue) };
  }

  async reportFailure(keyId: string | null, status: number) {
    if (!keyId) return;
    const terminal = status === 401 || status === 403;
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { failureCount: { increment: 1 }, status: terminal ? 'INVALID' : undefined, pausedUntil: terminal ? null : new Date(Date.now() + 60_000) } });
  }
}
