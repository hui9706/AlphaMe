import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CoinService } from './coin.service';
import { PrismaService } from './prisma.service';
import { RewardRiskService } from './reward-risk.service';
import { ZaloIdentityProvider } from './zalo.identity';

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService, private readonly coin: CoinService, private readonly risk: RewardRiskService, private readonly zalo: ZaloIdentityProvider) {}

  async create(userId: string, generationId: string) {
    const sharer = await this.prisma.user.findUnique({ where: { id: userId }, select: { zaloOpenId: true } });
    if (!sharer?.zaloOpenId) throw new ForbiddenException('Zalo login is required for friend sharing');
    const generation = await this.prisma.generation.findFirst({ where: { id: generationId, userId, status: 'SUCCEEDED' }, select: { id: true, resultAssetUrl: true, resultPreviewAssetUrl: true } });
    if (!generation?.resultAssetUrl) throw new ConflictException('Only successful generations can be shared');
    const share = await this.prisma.shareAttribution.create({ data: { shareToken: randomUUID(), generationId, sharerId: userId } });
    return { shareToken: share.shareToken, generationId: share.generationId };
  }

  async open(userId: string, shareToken: string, friendAccessToken: string, contextType: 'USER_CHAT' | 'GROUP_CHAT' | '') {
    const friend = await this.prisma.user.findUnique({ where: { id: userId }, select: { zaloOpenId: true } });
    if (!friend?.zaloOpenId) throw new ForbiddenException('Zalo login is required to open a friend share');
    const share = await this.prisma.shareAttribution.findUnique({ where: { shareToken }, include: { reward: true } });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.sharerId === userId) throw new ForbiddenException('The owner cannot claim a share reward');
    if (contextType !== 'GROUP_CHAT') {
      const sharer = await this.prisma.user.findUnique({ where: { id: share.sharerId }, select: { zaloOpenId: true } });
      if (!sharer?.zaloOpenId) throw new ConflictException('Share owner is not linked to Zalo');
      await this.zalo.assertFriend(friendAccessToken, sharer.zaloOpenId);
    }
    if (share.friendId === userId) return { opened: true, rewarded: Boolean(share.reward), alreadyOpened: true };
    if (share.friendId && share.friendId !== userId) throw new ConflictException('Share link was opened by another friend');

    const existingFriendOpen = await this.prisma.shareAttribution.findFirst({ where: { generationId: share.generationId, sharerId: share.sharerId, friendId: userId }, include: { reward: true } });
    if (existingFriendOpen) return { opened: true, rewarded: Boolean(existingFriendOpen.reward), duplicateFriend: true };
    await this.risk.assertShareAllowed(share.sharerId, share.id);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.shareAttribution.findUnique({ where: { id: share.id }, include: { reward: true } });
      if (!current) throw new NotFoundException('Share link not found');
      if (current.friendId && current.friendId !== userId) throw new ConflictException('Share link was opened by another friend');
      const opened = await tx.shareAttribution.update({ where: { id: current.id }, data: { friendId: userId, openedAt: new Date() } });
      const reward = await this.coin.grantRewardInTransaction(tx, {
        userId: share.sharerId,
        type: 'SHARE_OPEN',
        amount: 10,
        idempotencyKey: `share-open:${opened.id}`,
        sourceType: 'SHARE_OPEN',
        sourceId: opened.id,
        rewardRelations: { shareId: opened.id },
      });
      return { opened: true, rewarded: Boolean(reward.ledger), alreadyOpened: false, rewardId: reward.reward.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
