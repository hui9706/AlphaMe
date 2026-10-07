import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CoinService } from './coin.service';
import { PrismaService } from './prisma.service';
import { RewardRiskService } from './reward-risk.service';

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly risk: RewardRiskService) {}

  async create(userId: string) {
    const sharer = await this.prisma.user.findUnique({ where: { id: userId }, select: { zaloOpenId: true } });
    if (!sharer?.zaloOpenId) throw new ForbiddenException('Zalo login is required for friend sharing');
    const share = await this.prisma.shareAttribution.create({ data: { shareToken: randomUUID(), sharerId: userId } });
    return { shareToken: share.shareToken };
  }

  async open(userId: string, shareToken: string) {
    const friend = await this.prisma.user.findUnique({ where: { id: userId }, select: { zaloOpenId: true } });
    if (!friend?.zaloOpenId) throw new ForbiddenException('Zalo login is required to open a friend share');
    const share = await this.prisma.shareAttribution.findUnique({ where: { shareToken }, include: { reward: true } });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.sharerId === userId) throw new ForbiddenException('The owner cannot claim a share reward');
    if (share.friendId === userId) return { opened: true, rewarded: Boolean(share.reward), alreadyOpened: true };
    if (share.friendId && share.friendId !== userId) throw new ConflictException('Share link was opened by another friend');

    const existingFriendOpen = await this.prisma.shareAttribution.findFirst({ where: { sharerId: share.sharerId, friendId: userId }, include: { reward: true } });
    if (existingFriendOpen) return { opened: true, rewarded: Boolean(existingFriendOpen.reward), duplicateFriend: true };
    await this.risk.assertShareAllowed(share.sharerId, share.id);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.shareAttribution.findUnique({ where: { id: share.id }, include: { reward: true } });
      if (!current) throw new NotFoundException('Share link not found');
      if (current.friendId && current.friendId !== userId) throw new ConflictException('Share link was opened by another friend');
      const opened = await tx.shareAttribution.update({ where: { id: current.id }, data: { friendId: userId, openedAt: new Date() } });
      const config = await tx.coinRewardConfig.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
      const reward = config.inviterAmount > 0 ? await this.coin.grantRewardInTransaction(tx, {
        userId: share.sharerId,
        type: 'SHARE_OPEN',
        amount: config.inviterAmount,
        idempotencyKey: `share-open:${share.sharerId}:${userId}`,
        sourceType: 'SHARE_OPEN',
        sourceId: opened.id,
        rewardRelations: { shareId: opened.id },
      }) : null;
      return { opened: true, rewarded: Boolean(reward?.ledger), alreadyOpened: false, ...(reward ? { rewardId: reward.reward.id } : {}) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
