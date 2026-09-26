import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class CoinService {
  constructor(private readonly prisma: PrismaService) {}

  balance(userId: string) {
    return this.prisma.coinAccount.findUnique({ where: { userId }, select: { available: true, frozen: true, updatedAt: true } });
  }

  ledger(userId: string, limit = 50) {
    return this.prisma.coinLedger.findMany({ where: { account: { userId } }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, type: true, amount: true, availableAfter: true, frozenAfter: true, generationId: true, note: true, createdAt: true } });
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
}
