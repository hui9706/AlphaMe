import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { SecretsService } from './secrets.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly secrets: SecretsService) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !admin.enabled || !this.verifyPassword(password, admin.passwordHash)) throw new UnauthorizedException('Invalid admin credentials');
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return { accessToken: await this.jwt.signAsync({ sub: admin.id, scope: 'admin', role: admin.role }), admin: { id: admin.id, username: admin.username, role: admin.role } };
  }

  stats() {
    return Promise.all([this.prisma.user.count(), this.prisma.generation.count(), this.prisma.generation.count({ where: { status: 'SUCCEEDED' } }), this.prisma.generation.count({ where: { status: { in: ['QUEUED', 'PROCESSING'] } } }), this.prisma.coinLedger.aggregate({ _sum: { amount: true }, where: { type: 'GENERATION_CHARGE' } })]).then(([users, generations, succeeded, processing, charged]) => ({ users, generations, succeeded, processing, coinCharged: Math.abs(charged._sum.amount ?? 0) }));
  }

  users(limit = 50) { return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, zaloOpenId: true, displayName: true, avatarUrl: true, language: true, createdAt: true, coinAccount: true } }); }
  generations(limit = 50) { return this.prisma.generation.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), include: { user: { select: { displayName: true, zaloOpenId: true } }, template: { select: { slug: true, nameVi: true, nameZh: true } } } }); }
  templates() { return this.prisma.template.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }); }
  createTemplate(data: { slug: string; nameVi: string; nameZh: string; prompt: string; coinCost?: number; coverUrl?: string }) { return this.prisma.template.create({ data: { ...data, coinCost: data.coinCost ?? 10 } }); }
  updateTemplate(id: string, data: Partial<{ nameVi: string; nameZh: string; prompt: string; coinCost: number; coverUrl: string; enabled: boolean; sortOrder: number }>) { return this.prisma.template.update({ where: { id }, data }); }
  async reorderTemplates(templateIds: string[]) {
    return this.prisma.$transaction(templateIds.map((id, index) => this.prisma.template.update({ where: { id }, data: { sortOrder: index } })));
  }
  apiKeys() { return this.prisma.apiKey.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], select: { id: true, label: true, priority: true, status: true, failureCount: true, lastUsedAt: true, pausedUntil: true, createdAt: true } }); }
  createApiKey(label: string, value: string, priority = 100) { return this.prisma.apiKey.create({ data: { label, encryptedValue: this.secrets.encrypt(value), priority }, select: { id: true, label: true, priority: true, status: true } }); }
  updateApiKey(id: string, data: { priority?: number; status?: 'ACTIVE' | 'PAUSED' }) { return this.prisma.apiKey.update({ where: { id }, data }); }

  static hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
  private verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
}
