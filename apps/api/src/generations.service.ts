import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(userId: string, input: { templateId: string; sourceAssetUrl: string; idempotencyKey: string }) {
    const template = await this.prisma.template.findFirst({ where: { id: input.templateId, enabled: true } });
    if (!template) throw new NotFoundException('Template not found');
    const existing = await this.prisma.generation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const generation = await this.prisma.$transaction(async (tx) => {
      const generation = await tx.generation.create({ data: { idempotencyKey: input.idempotencyKey, userId, templateId: template.id, sourceAssetUrl: input.sourceAssetUrl, coinCost: template.coinCost } });
      await this.coin.reserveInTransaction(tx, userId, template.coinCost, `reserve:${generation.id}`, generation.id);
      return generation;
    });
    await this.queue.add(generation.id);
    return generation;
  }
}
