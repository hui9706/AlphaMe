import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CoinService } from './coin.service';
import { PrismaService } from './prisma.service';
import { RewardRiskService } from './reward-risk.service';

@Injectable()
export class PlazaService {
  constructor(private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly risk: RewardRiskService) {}

  async list(userId?: string, limit = 30) {
    const works = await this.prisma.plazaWork.findMany({
      orderBy: { publishedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        generation: { select: { id: true, resultAssetUrl: true, resultPreviewAssetUrl: true, createdAt: true } },
        _count: { select: { likes: true } },
      },
    });
    const likedIds = userId ? new Set((await this.prisma.plazaLike.findMany({ where: { userId, plazaWorkId: { in: works.map((work) => work.id) } }, select: { plazaWorkId: true } })).map((like) => like.plazaWorkId)) : new Set<string>();
    return works.map((work) => ({ ...work, likes: work._count.likes, liked: likedIds.has(work.id), _count: undefined }));
  }

  async listMine(userId: string) {
    return this.prisma.plazaWork.findMany({
      where: { userId },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, generationId: true },
    });
  }

  async publish(userId: string, generationId: string) {
    const generation = await this.prisma.generation.findFirst({ where: { id: generationId, userId, status: 'SUCCEEDED' }, select: { id: true, resultAssetUrl: true } });
    if (!generation?.resultAssetUrl) throw new ConflictException('Only successful generations can be published');
    return this.prisma.plazaWork.upsert({
      where: { generationId },
      create: { generationId, userId },
      update: {},
      include: { _count: { select: { likes: true } } },
    });
  }

  async unpublish(userId: string, plazaWorkId: string) {
    const work = await this.prisma.plazaWork.findUnique({ where: { id: plazaWorkId }, select: { id: true, userId: true } });
    if (!work) throw new NotFoundException('Plaza work not found');
    if (work.userId !== userId) throw new ForbiddenException('You can only remove your own work from the plaza');
    await this.prisma.plazaWork.delete({ where: { id: plazaWorkId } });
    return { id: plazaWorkId, unpublished: true };
  }

  async like(userId: string, plazaWorkId: string) {
    const existing = await this.prisma.plazaLike.findUnique({ where: { plazaWorkId_userId: { plazaWorkId, userId } } });
    if (existing) {
      return { plazaWorkId, liked: true, alreadyLiked: true, likes: await this.prisma.plazaLike.count({ where: { plazaWorkId } }) };
    }
    await this.risk.assertLikeAllowed(userId, plazaWorkId);
    return this.prisma.$transaction(async (tx) => {
      const work = await tx.plazaWork.findUnique({ where: { id: plazaWorkId }, select: { id: true, userId: true } });
      if (!work) throw new NotFoundException('Plaza work not found');
      if (work.userId === userId) throw new ForbiddenException('You cannot like your own work');
      const existingLike = await tx.plazaLike.findUnique({ where: { plazaWorkId_userId: { plazaWorkId, userId } } });
      const like = existingLike ?? await tx.plazaLike.create({ data: { plazaWorkId, userId } });
      await this.coin.grantRewardInTransaction(tx, {
        userId: work.userId,
        type: 'PLAZA_LIKE',
        amount: 10,
        idempotencyKey: `plaza-like:${like.id}`,
        sourceType: 'PLAZA_LIKE',
        sourceId: like.id,
        rewardRelations: { plazaLikeId: like.id, plazaWorkId },
      });
      const likes = await tx.plazaLike.count({ where: { plazaWorkId } });
      return { plazaWorkId, liked: true, alreadyLiked: Boolean(existingLike), likes };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async unlike(userId: string, plazaWorkId: string) {
    const result = await this.prisma.plazaLike.deleteMany({ where: { plazaWorkId, userId } });
    const likes = await this.prisma.plazaLike.count({ where: { plazaWorkId } });
    return { plazaWorkId, liked: false, removed: result.count > 0, likes };
  }
}
