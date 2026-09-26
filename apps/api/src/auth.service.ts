import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { ZaloIdentityProvider } from './zalo.identity';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly zalo: ZaloIdentityProvider) {}

  async loginWithZalo(accessToken: string) {
    const identity = process.env.ZALO_AUTH_MODE === 'stub' ? { openId: 'dev:local-user' } : await this.zalo.getIdentity(accessToken);
    const zaloOpenId = identity.openId;
    const user = await this.prisma.user.upsert({
      where: { zaloOpenId },
      update: { displayName: identity.displayName, avatarUrl: identity.avatarUrl },
      create: { zaloOpenId, displayName: identity.displayName, avatarUrl: identity.avatarUrl, coinAccount: { create: { available: 10, ledger: { create: { type: 'INITIAL_GRANT', amount: 10, availableAfter: 10, frozenAfter: 0, idempotencyKey: `initial:${zaloOpenId}` } } } } },
      include: { coinAccount: true },
    });
    return { accessToken: await this.jwt.signAsync({ sub: user.id }), user };
  }

  getMe(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, include: { coinAccount: true } });
  }
}
