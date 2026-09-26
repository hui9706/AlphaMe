import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CoinService } from './coin.service';
import { PrismaService } from './prisma.service';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function vietnamDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: VIETNAM_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateValue(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService, private readonly coin: CoinService) {}

  async status(userId: string) {
    const dateKey = vietnamDateKey();
    const record = await this.prisma.dailyCheckIn.findUnique({ where: { userId_checkInDate: { userId, checkInDate: dateValue(dateKey) } } });
    return { date: dateKey, checkedIn: Boolean(record), rewardAmount: 10 };
  }

  async checkIn(userId: string) {
    const dateKey = vietnamDateKey();
    return this.prisma.$transaction(async (tx) => {
      const existingCheckIn = await tx.dailyCheckIn.findUnique({ where: { userId_checkInDate: { userId, checkInDate: dateValue(dateKey) } } });
      const checkIn = await tx.dailyCheckIn.upsert({
        where: { userId_checkInDate: { userId, checkInDate: dateValue(dateKey) } },
        create: { userId, checkInDate: dateValue(dateKey) },
        update: {},
      });
      const reward = await this.coin.grantRewardInTransaction(tx, {
        userId,
        type: 'DAILY_CHECK_IN',
        amount: 10,
        idempotencyKey: `check-in:${userId}:${dateKey}`,
        sourceType: 'DAILY_CHECK_IN',
        sourceId: dateKey,
        rewardRelations: { dailyCheckInId: checkIn.id },
      });
      return { date: dateKey, checkedIn: true, alreadyCheckedIn: Boolean(existingCheckIn), rewardAmount: 10, rewardId: reward.reward.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
