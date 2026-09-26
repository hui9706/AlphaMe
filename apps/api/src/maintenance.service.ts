import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { PrismaService } from './prisma.service';
import { CoinService } from './coin.service';
import { StorageService } from './storage.service';

@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly storage: StorageService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  private async run() {
    try {
      const expired = await this.prisma.asset.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true, storageKey: true, storageProvider: true, userId: true } });
      for (const asset of expired) {
        if (asset.storageProvider === 'local') {
          const stored = await this.storage.read(asset.id);
          if (stored) await unlink(stored.path).catch(() => undefined);
        }
      }
      if (expired.length) await this.prisma.asset.deleteMany({ where: { id: { in: expired.map((asset) => asset.id) } } });

      const timeoutMinutes = Number(this.config.get('GENERATION_TIMEOUT_MINUTES', 30));
      const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      const stuck = await this.prisma.generation.findMany({ where: { status: { in: ['QUEUED', 'PROCESSING'] }, updatedAt: { lt: cutoff } }, select: { id: true, userId: true, coinCost: true } });
      for (const generation of stuck) {
        const updated = await this.prisma.generation.updateMany({ where: { id: generation.id, status: { in: ['QUEUED', 'PROCESSING'] } }, data: { status: 'FAILED', errorCode: 'GENERATION_TIMEOUT', errorMessage: 'Generation timed out' } });
        if (updated.count) await this.coin.refund(generation.userId, generation.coinCost, generation.id).catch(() => undefined);
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Maintenance run failed');
    }
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
