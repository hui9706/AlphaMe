import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { SecretsService } from './secrets.service';
import { CoinService } from './coin.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly secrets: SecretsService, private readonly coin: CoinService) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !admin.enabled || !this.verifyPassword(password, admin.passwordHash)) throw new UnauthorizedException('Invalid admin credentials');
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return { accessToken: await this.jwt.signAsync({ sub: admin.id, scope: 'admin', role: admin.role }), admin: { id: admin.id, username: admin.username, role: admin.role } };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin || !admin.enabled) throw new UnauthorizedException('Admin account is unavailable');
    if (!this.verifyPassword(currentPassword, admin.passwordHash)) throw new BadRequestException('Current password is incorrect');
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: AdminService.hashPassword(newPassword) } });
    return { ok: true };
  }

  stats() {
    return Promise.all([this.prisma.user.count(), this.prisma.generation.count(), this.prisma.generation.count({ where: { status: 'SUCCEEDED' } }), this.prisma.generation.count({ where: { status: { in: ['QUEUED', 'PROCESSING'] } } }), this.prisma.coinLedger.aggregate({ _sum: { amount: true }, where: { type: 'GENERATION_CHARGE' } })]).then(([users, generations, succeeded, processing, charged]) => ({ users, generations, succeeded, processing, coinCharged: Math.abs(charged._sum.amount ?? 0) }));
  }

  users(limit = 50) { return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, language: true, isAdmin: true, createdAt: true, coinAccount: true } }); }
  async createUser(input: { username: string; password: string; displayName?: string; language?: string; initialCoin?: number }) {
    const username = input.username.trim().toLowerCase();
    const initialCoin = input.initialCoin ?? 10;
    try {
      return await this.prisma.user.create({
        data: {
          username,
          passwordHash: AdminService.hashPassword(input.password),
          displayName: input.displayName?.trim() || username,
          language: input.language ?? 'vi',
          coinAccount: { create: { available: initialCoin, ...(initialCoin > 0 ? { ledger: { create: { type: 'INITIAL_GRANT', amount: initialCoin, availableAfter: initialCoin, frozenAfter: 0, idempotencyKey: `initial:account:${username}` } } } : {}) } },
        },
        select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, language: true, isAdmin: true, createdAt: true, coinAccount: true },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictException('Username is already taken');
      throw error;
    }
  }
  async resetUserPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.username) throw new BadRequestException('This user does not have a username and password account');
    return this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: AdminService.hashPassword(password) },
      select: { id: true, username: true, displayName: true },
    });
  }
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, displayName: true, coinAccount: { select: { id: true } } } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.$transaction(async (tx) => {
      // Generation rows use RESTRICT so remove their ledger references before deleting them.
      if (user.coinAccount) await tx.coinLedger.deleteMany({ where: { accountId: user.coinAccount.id } });
      await tx.rewardRecord.deleteMany({ where: { userId } });
      await tx.shareAttribution.deleteMany({ where: { sharerId: userId } });
      await tx.plazaLike.deleteMany({ where: { userId } });
      await tx.plazaWork.deleteMany({ where: { userId } });
      await tx.generation.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { id: user.id, username: user.username, displayName: user.displayName };
  }
  setUserAdminStatus(userId: string, isAdmin: boolean) { return this.prisma.user.update({ where: { id: userId }, data: { isAdmin }, select: { id: true, username: true, zaloOpenId: true, displayName: true, avatarUrl: true, language: true, isAdmin: true, createdAt: true, coinAccount: true } }); }
  async coinAccount(userId: string, limit = 100) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        zaloOpenId: true,
        displayName: true,
        coinAccount: {
          select: {
            available: true,
            frozen: true,
            updatedAt: true,
            ledger: {
              orderBy: { createdAt: 'desc' },
              take: Math.min(Math.max(limit, 1), 200),
              include: {
                rewardRecord: { select: { id: true, type: true, status: true, amount: true, sourceType: true, sourceId: true, note: true, revokedAt: true, revokeReason: true } },
                adminUser: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
  adjustCoin(userId: string, amount: number, note: string, idempotencyKey: string, adminUserId: string) { return this.coin.adminAdjust(userId, amount, idempotencyKey, adminUserId, note); }
  revokeReward(rewardId: string, adminUserId: string, reason: string) { return this.coin.revokeReward(rewardId, adminUserId, reason); }
  rewards(userId?: string, status?: 'GRANTED' | 'REVOKED' | 'BLOCKED', limit = 100) { return this.prisma.rewardRecord.findMany({ where: { ...(userId ? { userId } : {}), ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 200), include: { user: { select: { id: true, displayName: true, zaloOpenId: true } }, ledger: { select: { id: true, type: true, amount: true, adminUserId: true, note: true, createdAt: true } }, revokedByAdmin: { select: { id: true, username: true } } } }); }
  riskEvents(status?: 'OPEN' | 'REVIEWED' | 'BLOCKED', limit = 100) { return this.prisma.rewardRiskEvent.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 200), include: { user: { select: { id: true, displayName: true, zaloOpenId: true } }, reviewedByAdmin: { select: { id: true, username: true } } } }); }
  reviewRiskEvent(id: string, status: 'REVIEWED' | 'CLEARED', adminUserId: string) { return this.prisma.rewardRiskEvent.update({ where: { id }, data: { status, reviewedByAdminId: adminUserId, reviewedAt: new Date() }, include: { user: { select: { id: true, displayName: true, zaloOpenId: true } }, reviewedByAdmin: { select: { id: true, username: true } } } }); }
  generations(limit = 50) { return this.prisma.generation.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), include: { user: { select: { displayName: true, zaloOpenId: true } }, template: { select: { slug: true, nameVi: true, nameZh: true } } } }); }
  templates() { return this.prisma.template.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }); }
  async homeHeroImages() { return await this.prisma.homeHeroImages.findUnique({ where: { id: 'default' }, select: { leftUrl: true, centerUrl: true, rightUrl: true } }) ?? { leftUrl: '', centerUrl: '', rightUrl: '' }; }

  async coinRewardConfig() { return this.prisma.coinRewardConfig.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }); }

  updateCoinRewardConfig(data: { newUserAmount: number; inviteeBonusAmount: number; inviterAmount: number }) {
    return this.prisma.coinRewardConfig.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: data });
  }
  webpTemplateCoverLibrary() { return this.prisma.asset.findMany({ where: { kind: 'template-cover', mimeType: 'image/webp', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, publicUrl: true, byteSize: true, createdAt: true } }); }
  updateHomeHeroImages(data: { leftUrl?: string; centerUrl?: string; rightUrl?: string }) {
    const values = { leftUrl: data.leftUrl?.trim() || null, centerUrl: data.centerUrl?.trim() || null, rightUrl: data.rightUrl?.trim() || null };
    return this.prisma.homeHeroImages.upsert({ where: { id: 'default' }, create: { id: 'default', ...values }, update: values, select: { leftUrl: true, centerUrl: true, rightUrl: true } });
  }
  createTemplate(data: { slug: string; nameVi: string; nameZh: string; categoryVi: string; categoryZh: string; prompt: string; coinCost?: number; isCouple?: boolean; coverUrl?: string }) { return this.prisma.template.create({ data: { ...data, coinCost: data.isCouple ? 20 : (data.coinCost ?? 10) } }); }
  async updateTemplate(id: string, data: Partial<{ nameVi: string; nameZh: string; categoryVi: string; categoryZh: string; prompt: string; coinCost: number; isCouple: boolean; coverUrl: string; enabled: boolean; sortOrder: number }>) {
    const current = data.coverUrl !== undefined ? await this.prisma.template.findUnique({ where: { id }, select: { coverUrl: true } }) : null;
    const coverChanged = current && current.coverUrl !== data.coverUrl;
    const updated = { ...data, ...(data.isCouple === true ? { coinCost: 20 } : {}), ...(coverChanged ? { coverOriginalUrl: null } : {}) };
    return this.prisma.template.update({ where: { id }, data: updated });
  }
  async reorderTemplates(templateIds: string[]) {
    return this.prisma.$transaction(templateIds.map((id, index) => this.prisma.template.update({ where: { id }, data: { sortOrder: index } })));
  }
  apiKeys() { return this.prisma.apiKey.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], select: { id: true, label: true, priority: true, status: true, failureCount: true, lastUsedAt: true, pausedUntil: true, createdAt: true } }); }
  createApiKey(label: string, value: string, priority = 100) { return this.prisma.apiKey.create({ data: { label, encryptedValue: this.secrets.encrypt(value), priority }, select: { id: true, label: true, priority: true, status: true } }); }
  updateApiKey(id: string, data: { priority?: number; status?: 'ACTIVE' | 'PAUSED' }) { return this.prisma.apiKey.update({ where: { id }, data }); }

  static hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
  private verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
}
