import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const LIKE_WINDOW_MS = 10 * 60 * 1000;
const SHARE_WINDOW_MS = 10 * 60 * 1000;
const LIKE_LIMIT = 30;
const SHARE_LIMIT = 10;

@Injectable()
export class RewardRiskService {
  constructor(private readonly prisma: PrismaService) {}

  async assertLikeAllowed(userId: string, sourceId: string) {
    const since = new Date(Date.now() - LIKE_WINDOW_MS);
    const count = await this.prisma.plazaLike.count({ where: { userId, createdAt: { gte: since } } });
    if (count < LIKE_LIMIT) return;
    await this.recordBlocked(userId, 'PLAZA_LIKE_RATE', 'PLAZA_LIKE', sourceId, `More than ${LIKE_LIMIT} likes in 10 minutes`);
    throw new HttpException('Like activity is temporarily limited', HttpStatus.TOO_MANY_REQUESTS);
  }

  async assertShareAllowed(sharerId: string, sourceId: string) {
    const since = new Date(Date.now() - SHARE_WINDOW_MS);
    const count = await this.prisma.shareAttribution.count({ where: { sharerId, openedAt: { gte: since } } });
    if (count < SHARE_LIMIT) return;
    await this.recordBlocked(sharerId, 'SHARE_OPEN_RATE', 'SHARE_OPEN', sourceId, `More than ${SHARE_LIMIT} rewarded share opens in 10 minutes`);
    throw new HttpException('Share activity is temporarily limited', HttpStatus.TOO_MANY_REQUESTS);
  }

  private recordBlocked(userId: string, type: string, sourceType: string, sourceId: string, detail: string) {
    return this.prisma.rewardRiskEvent.create({ data: { userId, type, status: 'BLOCKED', score: 100, sourceType, sourceId, detail } });
  }
}
