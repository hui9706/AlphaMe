import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { PrismaService } from './prisma.service';
import { CoinService } from './coin.service';
import { SeedreamProvider } from './providers/seedream.provider';
import { StorageService } from './storage.service';

@Injectable()
export class GenerationWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly seedream: SeedreamProvider, private readonly storage: StorageService) {}

  onModuleInit() {
    if (this.config.get('DISABLE_GENERATION_WORKER') === 'true') return;
    this.worker = new Worker('alphame-generations', (job) => this.process(job), { connection: { url: this.config.get('REDIS_URL', 'redis://localhost:6379') }, concurrency: 2 });
  }

  private async process(job: Job<{ generationId: string }>) {
    const generation = await this.prisma.generation.findUnique({ where: { id: job.data.generationId }, include: { template: true } });
    if (!generation || generation.status === 'SUCCEEDED') return;
    await this.prisma.generation.update({ where: { id: generation.id }, data: { status: 'PROCESSING', errorCode: null, errorMessage: null } });
    try {
      const result = await this.seedream.createImage({ prompt: generation.template.prompt, sourceAssetUrl: generation.sourceAssetUrl });
      const assets = await this.storage.importGenerated(generation.userId, result.url, Number(this.config.get('GENERATED_RETENTION_DAYS', 30)));
      await this.coin.charge(generation.userId, generation.coinCost, generation.id);
      await this.prisma.generation.update({ where: { id: generation.id }, data: { status: 'SUCCEEDED', resultAssetUrl: assets.original.publicUrl, resultPreviewAssetUrl: assets.preview.publicUrl } });
    } catch (error) {
      await this.prisma.generation.update({ where: { id: generation.id }, data: { status: 'FAILED', errorCode: 'GENERATION_FAILED', errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown generation error' } });
      await this.coin.refund(generation.userId, generation.coinCost, generation.id).catch(() => undefined);
      throw error;
    }
  }

  async onModuleDestroy() { await this.worker?.close(); }
}
