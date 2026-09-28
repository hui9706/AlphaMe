import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { ZaloIdentityProvider } from './zalo.identity';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly zalo: ZaloIdentityProvider) {}

  async loginWithZalo(accessToken: string, profile?: { displayName?: string; avatarUrl?: string }) {
    const identity = process.env.ZALO_AUTH_MODE === 'stub' ? { openId: 'dev:local-user' } : await this.zalo.getIdentity(accessToken);
    const zaloOpenId = identity.openId;
    const displayName = profile?.displayName?.trim() || identity.displayName;
    const avatarUrl = profile?.avatarUrl || identity.avatarUrl;
    const user = await this.prisma.user.upsert({
      where: { zaloOpenId },
      update: { ...(displayName ? { displayName } : {}), ...(avatarUrl ? { avatarUrl } : {}) },
      create: { zaloOpenId, displayName, avatarUrl, coinAccount: { create: { available: 10, ledger: { create: { type: 'INITIAL_GRANT', amount: 10, availableAfter: 10, frozenAfter: 0, idempotencyKey: `initial:${zaloOpenId}` } } } } },
      select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true },
    });
    return this.createSession(user);
  }

  async linkZaloAccount(userId: string, accessToken: string) {
    const identity = process.env.ZALO_AUTH_MODE === 'stub' ? { openId: 'dev:local-user' } : await this.zalo.getIdentity(accessToken);
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, zaloOpenId: true } });
    if (!current) throw new UnauthorizedException('Account not found');
    if (current.zaloOpenId && current.zaloOpenId !== identity.openId) throw new ConflictException('A different Zalo account is already linked');
    const owner = await this.prisma.user.findUnique({ where: { zaloOpenId: identity.openId }, select: { id: true } });
    if (owner && owner.id !== userId) throw new ConflictException('This Zalo account is linked to another AlphaMe account');
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { zaloOpenId: identity.openId },
        select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true },
      }).then((user) => this.decorateUser(user));
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('This Zalo account is linked to another AlphaMe account');
      }
      throw error;
    }
  }

  async register(username: string, password: string) {
    const normalizedUsername = username.toLowerCase();
    try {
      const user = await this.prisma.user.create({
        data: {
          username: normalizedUsername,
          passwordHash: this.hashPassword(password),
          displayName: normalizedUsername,
          coinAccount: { create: { available: 10, ledger: { create: { type: 'INITIAL_GRANT', amount: 10, availableAfter: 10, frozenAfter: 0, idempotencyKey: `initial:account:${normalizedUsername}` } } } },
        },
        select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true },
      });
      return this.createSession(user);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Username is already taken');
      }
      throw error;
    }
  }

  async loginWithCredentials(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user?.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const sessionUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true },
    });
    return this.createSession(sessionUser);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true } });
    return user ? this.decorateUser(user) : null;
  }

  async updateProfile(userId: string, displayName: string, avatarUrl?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName, ...(avatarUrl ? { avatarUrl } : {}) },
      select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, isAdmin: true, coinAccount: true },
    });
    return this.decorateUser(user);
  }

  private createSession(user: { id: string; username: string | null; zaloOpenId?: string | null; displayName: string | null; avatarUrl: string | null; isAdmin: boolean; coinAccount: { available: number; frozen: number } | null }) {
    return this.jwt.signAsync({ sub: user.id }).then((accessToken) => ({ accessToken, user: this.decorateUser(user) }));
  }

  private decorateUser(user: { id: string; username: string | null; zaloOpenId?: string | null; displayName: string | null; avatarUrl: string | null; isAdmin: boolean; coinAccount: { available: number; frozen: number } | null }) {
    return { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin, zaloLinked: Boolean(user.zaloOpenId), coinAccount: user.coinAccount };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, 64);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
