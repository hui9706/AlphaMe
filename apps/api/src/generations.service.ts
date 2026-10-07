import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CoinService } from './coin.service';
import { GenerationQueue } from './generation.queue';

@Injectable()
export class GenerationsService {
  constructor(private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly queue: GenerationQueue) {}

  list(userId: string, limit = 30) {
    return this.prisma.generation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), include: { template: { select: { slug: true, nameVi: true, nameZh: true } } } });
  }

  async get(userId: string, id: string) {
    return this.prisma.generation.findFirst({ where: { id, userId }, include: { template: true } });
  }

  async create(userId: string, input: { templateId: string; sourceAssetUrl: string; sourceAssetUrl2?: string; idempotencyKey: string }) {
    const template = await this.prisma.template.findFirst({ where: { id: input.templateId, enabled: true } });
    if (!template) throw new NotFoundException('Template not found');
    if (template.isCouple && !input.sourceAssetUrl2) throw new BadRequestException('Two photos are required for this template');
    if (!template.isCouple && input.sourceAssetUrl2) throw new BadRequestException('This template accepts one photo');
    const existing = await this.prisma.generation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const generation = await this.prisma.$transaction(async (tx) => {
      const coinCost = template.isCouple ? 20 : template.coinCost;
      const generation = await tx.generation.create({ data: { idempotencyKey: input.idempotencyKey, userId, templateId: template.id, sourceAssetUrl: input.sourceAssetUrl, sourceAssetUrl2: input.sourceAssetUrl2, coinCost } });
      await this.coin.reserveInTransaction(tx, userId, coinCost, `reserve:${generation.id}`, generation.id);
      return generation;
    });
    try {
      await this.queue.add(generation.id);
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        const failed = await tx.generation.updateMany({
          where: { id: generation.id, status: 'QUEUED' },
          data: { status: 'FAILED', errorCode: 'QUEUE_UNAVAILABLE', errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Generation queue unavailable' },
        });
        if (failed.count) await this.coin.refundInTransaction(tx, userId, generation.coinCost, generation.id);
      });
      throw error;
    }
    return generation;
  }
}
