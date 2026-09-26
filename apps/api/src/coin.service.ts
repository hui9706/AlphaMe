import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

type RewardGrantInput = {
  userId: string;
  type: 'DAILY_CHECK_IN' | 'SHARE_OPEN' | 'PLAZA_LIKE';
  amount: number;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  note?: string;
  rewardRelations?: {
    dailyCheckInId?: string;
    plazaLikeId?: string;
    plazaWorkId?: string;
    shareId?: string;
  };
};

@Injectable()
export class CoinService {
  constructor(private readonly prisma: PrismaService) {}

  balance(userId: string) {
    return this.prisma.coinAccount.findUnique({ where: { userId }, select: { available: true, frozen: true, updatedAt: true } });
  }

  async ledger(userId: string, limit = 50) {
    const entries = await this.prisma.coinLedger.findMany({ where: { account: { userId } }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, type: true, amount: true, availableAfter: true, frozenAfter: true, generationId: true, note: true, createdAt: true, rewardRecord: { select: { type: true, status: true, sourceType: true, sourceId: true, revokeReason: true } } } });
    return entries.map(({ rewardRecord, ...entry }) => ({ ...entry, rewardType: rewardRecord?.type ?? null, rewardStatus: rewardRecord?.status ?? null, rewardSourceType: rewardRecord?.sourceType ?? null, rewardSourceId: rewardRecord?.sourceId ?? null, revokeReason: rewardRecord?.revokeReason ?? null }));
  }

  async adjustAvailable(userId: string, amount: number, idempotencyKey: string, options: { type?: 'ADMIN_ADJUSTMENT'; note?: string; adminUserId?: string; rewardRecordId?: string } = {}) {
    if (!Number.isInteger(amount) || amount === 0) throw new UnprocessableEntityException('Coin amount must be a non-zero integer');
    return this.prisma.$transaction((tx) => this.applyAvailableDelta(tx, userId, amount, idempotencyKey, {
      ledgerType: options.type ?? 'ADMIN_ADJUSTMENT',
      note: options.note,
      adminUserId: options.adminUserId,
      rewardRecordId: options.rewardRecordId,
    }));
  }

  async adminAdjust(userId: string, amount: number, idempotencyKey: string, adminUserId: string, note: string) {
    if (!Number.isInteger(amount) || amount === 0) throw new UnprocessableEntityException('Coin amount must be a non-zero integer');
    if (!note.trim()) throw new UnprocessableEntityException('Adjustment reason is required');
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.rewardRecord.upsert({
        where: { idempotencyKey },
        create: { userId, type: 'ADMIN_ADJUSTMENT', amount, idempotencyKey, sourceType: 'ADMIN_ADJUSTMENT', sourceId: userId, note: note.trim() },
        update: {},
      });
      if (reward.userId !== userId || reward.amount !== amount || reward.type !== 'ADMIN_ADJUSTMENT') throw new ConflictException('Idempotency key is already used for another adjustment');
      const existingLedger = await tx.coinLedger.findUnique({ where: { rewardRecordId: reward.id } });
      if (existingLedger) return { reward, ledger: existingLedger };
      const ledger = await this.applyAvailableDelta(tx, userId, amount, `admin:${reward.id}`, { ledgerType: 'ADMIN_ADJUSTMENT', adminUserId, rewardRecordId: reward.id, note: note.trim() });
      return { reward, ledger };
    });
  }

  async grantReward(input: RewardGrantInput) {
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new UnprocessableEntityException('Reward amount must be a positive integer');
    return this.prisma.$transaction((tx) => this.grantRewardInTransaction(tx, input));
  }

  async grantRewardInTransaction(tx: Prisma.TransactionClient, input: RewardGrantInput) {
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new UnprocessableEntityException('Reward amount must be a positive integer');
    const reward = await tx.rewardRecord.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        note: input.note,
        ...input.rewardRelations,
      },
      update: {},
    });
    const existingLedger = await tx.coinLedger.findUnique({ where: { rewardRecordId: reward.id } });
    if (existingLedger || reward.status !== 'GRANTED') return { reward, ledger: existingLedger };
    const ledger = await this.applyAvailableDelta(tx, input.userId, input.amount, `reward:${reward.id}`, {
      ledgerType: 'REWARD',
      note: input.note,
      rewardRecordId: reward.id,
    });
    return { reward, ledger };
  }

  async revokeReward(rewardId: string, adminUserId: string, reason: string) {
    if (!reason.trim()) throw new UnprocessableEntityException('Revoke reason is required');
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.rewardRecord.findUnique({ where: { id: rewardId } });
      if (!reward) throw new NotFoundException('Reward record not found');
      if (reward.status === 'REVOKED') return reward;
      if (reward.status !== 'GRANTED') throw new ConflictException('Only granted rewards can be revoked');
      const reversal = await tx.rewardRecord.upsert({
        where: { idempotencyKey: `reversal:${reward.id}` },
        create: {
          userId: reward.userId,
          type: 'ADMIN_REVERSAL',
          amount: -reward.amount,
          idempotencyKey: `reversal:${reward.id}`,
          sourceType: 'REWARD_REVERSAL',
          sourceId: reward.id,
          note: reason.trim(),
        },
        update: {},
      });
      await this.applyAvailableDelta(tx, reward.userId, -reward.amount, `reward:${reversal.id}`, {
        ledgerType: 'REWARD_REVERSAL',
        adminUserId,
        note: reason.trim(),
        rewardRecordId: reversal.id,
      });
      return tx.rewardRecord.update({ where: { id: reward.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedByAdminId: adminUserId, revokeReason: reason.trim() } });
    });
  }

  async reserve(userId: string, amount: number, idempotencyKey: string, generationId: string) {
    return this.prisma.$transaction((tx) => this.reserveInTransaction(tx, userId, amount, idempotencyKey, generationId));
  }

  async reserveInTransaction(tx: Prisma.TransactionClient, userId: string, amount: number, idempotencyKey: string, generationId: string) {
      const existing = await tx.coinLedger.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
      const account = await tx.coinAccount.findUnique({ where: { userId } });
      if (!account) throw new NotFoundException('Coin account not found');
      if (account.available < amount) throw new UnprocessableEntityException('Insufficient Coin');
      const nextAvailable = account.available - amount;
      const nextFrozen = account.frozen + amount;
      await tx.coinAccount.update({ where: { id: account.id }, data: { available: nextAvailable, frozen: nextFrozen } });
      return tx.coinLedger.create({ data: { accountId: account.id, type: 'RESERVATION', amount: -amount, availableAfter: nextAvailable, frozenAfter: nextFrozen, idempotencyKey, generationId } });
  }

  async charge(userId: string, amount: number, generationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.coinAccount.findUnique({ where: { userId } });
      if (!account || account.frozen < amount) throw new ConflictException('Reserved Coin is missing');
      const availableAfter = account.available;
      const frozenAfter = account.frozen - amount;
      await tx.coinAccount.update({ where: { id: account.id }, data: { frozen: frozenAfter } });
      return tx.coinLedger.create({ data: { accountId: account.id, type: 'GENERATION_CHARGE', amount: 0, availableAfter, frozenAfter, idempotencyKey: `charge:${generationId}`, generationId } });
    });
  }

  async refund(userId: string, amount: number, generationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.coinAccount.findUnique({ where: { userId } });
      if (!account || account.frozen < amount) throw new ConflictException('Reserved Coin is missing');
      const availableAfter = account.available + amount;
      const frozenAfter = account.frozen - amount;
      await tx.coinAccount.update({ where: { id: account.id }, data: { available: availableAfter, frozen: frozenAfter } });
      return tx.coinLedger.create({ data: { accountId: account.id, type: 'REFUND', amount, availableAfter, frozenAfter, idempotencyKey: `refund:${generationId}`, generationId } });
    });
  }

  private async applyAvailableDelta(tx: Prisma.TransactionClient, userId: string, amount: number, idempotencyKey: string, options: { ledgerType: 'ADMIN_ADJUSTMENT' | 'REWARD' | 'REWARD_REVERSAL'; note?: string; adminUserId?: string; rewardRecordId?: string }) {
    const existing = await tx.coinLedger.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const rows = await tx.$queryRaw<Array<{ id: string; available: number; frozen: number }>>(Prisma.sql`SELECT id, available, frozen FROM CoinAccount WHERE userId = ${userId} FOR UPDATE`);
    const account = rows[0];
    if (!account) throw new NotFoundException('Coin account not found');
    if (account.available + amount < 0) throw new UnprocessableEntityException('Insufficient Coin');
    const availableAfter = account.available + amount;
    await tx.coinAccount.update({ where: { id: account.id }, data: { available: availableAfter } });
    return tx.coinLedger.create({ data: { accountId: account.id, type: options.ledgerType, amount, availableAfter, frozenAfter: account.frozen, idempotencyKey, adminUserId: options.adminUserId, rewardRecordId: options.rewardRecordId, note: options.note } });
  }
}
