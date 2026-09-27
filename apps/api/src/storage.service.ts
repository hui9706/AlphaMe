import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';
import { SecretsService } from './secrets.service';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly secrets: SecretsService) {
    this.root = config.get('UPLOAD_ROOT', './var/uploads');
    this.publicBaseUrl = config.get('PUBLIC_ASSET_BASE_URL', 'http://localhost:3000/v1/assets');
  }

  async saveDataUrl(userId: string, dataUrl: string, kind: 'input' | 'generated' | 'avatar') {
    return this.saveDataUrlToStorage(dataUrl, { userId, kind, retentionDays: kind === 'input' ? 3 / 24 : kind === 'generated' ? 30 : undefined });
  }

  async saveTemplateCover(dataUrl: string) {
    return this.saveDataUrlToStorage(dataUrl, { kind: 'template-cover' });
  }

  async importRemote(userId: string, url: string, kind: 'generated', retentionDays: number) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset download failed with status ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw new Error('Generated image exceeds storage limit');
    const contentType = (response.headers.get('content-type') ?? 'image/jpeg').split(';')[0].toLowerCase();
    const mimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(contentType) ? contentType : 'image/jpeg';
    return this.saveBuffer(userId, buffer, mimeType, kind, retentionDays);
  }

  async read(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return null;
    const path = join(this.root, asset.storageKey);
    return { asset, path };
  }

  async readById(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || (asset.expiresAt && asset.expiresAt.getTime() <= Date.now())) return null;
    if (asset.storageProvider === 'qiniu') return { asset, url: await this.getQiniuUrl(asset.storageKey) };
    return { asset, path: join(this.root, asset.storageKey) };
  }

  async getStorageConfig() { return this.prisma.storageConfig.findUnique({ where: { id: 'default' } }); }

  async saveStorageConfig(input: { provider: string; enabled: boolean; qiniuAccessKey?: string; qiniuSecretKey?: string; qiniuBucket?: string; qiniuRegion?: string; qiniuDomain?: string; qiniuPrivate?: boolean; qiniuUrlTtlSeconds?: number; fallbackLocal?: boolean }) {
    const current = await this.getStorageConfig();
    const data = {
      provider: input.provider,
      enabled: input.enabled,
      qiniuAccessKey: input.qiniuAccessKey ? this.secrets.encrypt(input.qiniuAccessKey) : current?.qiniuAccessKey,
      qiniuSecretKey: input.qiniuSecretKey ? this.secrets.encrypt(input.qiniuSecretKey) : current?.qiniuSecretKey,
      qiniuBucket: input.qiniuBucket,
      qiniuRegion: input.qiniuRegion,
      qiniuDomain: input.qiniuDomain?.replace(/\/$/, ''),
      qiniuPrivate: input.qiniuPrivate ?? true,
      qiniuUrlTtlSeconds: Math.min(Math.max(input.qiniuUrlTtlSeconds ?? 2592000, 300), 2592000),
      fallbackLocal: input.fallbackLocal ?? true,
    };
    return this.prisma.storageConfig.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: data });
  }

  async testQiniuConnection(input: { qiniuAccessKey?: string; qiniuSecretKey?: string; qiniuBucket?: string }) {
    const current = await this.getStorageConfig();
    const encryptedAccessKey = input.qiniuAccessKey ? this.secrets.encrypt(input.qiniuAccessKey) : current?.qiniuAccessKey;
    const encryptedSecretKey = input.qiniuSecretKey ? this.secrets.encrypt(input.qiniuSecretKey) : current?.qiniuSecretKey;
    const bucket = input.qiniuBucket ?? current?.qiniuBucket;
    if (!encryptedAccessKey || !encryptedSecretKey || !bucket) throw new Error('请填写 AccessKey、SecretKey 和 Bucket');
    const accessKey = this.secrets.decrypt(encryptedAccessKey);
    const secretKey = this.secrets.decrypt(encryptedSecretKey);
    const path = '/buckets';
    const host = 'uc.qiniuapi.com';
    const contentType = 'application/x-www-form-urlencoded';
    const qiniuDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const signingString = `GET ${path}\nHost: ${host}\nContent-Type: ${contentType}\nX-Qiniu-Date: ${qiniuDate}\n\n`;
    const signature = createHmac('sha1', secretKey).update(signingString).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
    let response: Response;
    try {
      response = await fetch(`https://${host}${path}`, { headers: { 'Content-Type': contentType, 'X-Qiniu-Date': qiniuDate, Authorization: `Qiniu ${accessKey}:${signature}` } });
    } catch (error) {
      throw new BadGatewayException(`无法连接七牛云：${error instanceof Error ? error.message : '网络错误'}`);
    }
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 180);
      throw new BadGatewayException(`七牛云连接失败（HTTP ${response.status}）${detail ? `：${detail}` : ''}`);
    }
    const buckets = await response.json() as unknown;
    if (!Array.isArray(buckets) || !buckets.includes(bucket)) throw new Error('七牛云凭证有效，但找不到目标 Bucket');
    return { ok: true, message: `连接成功，Bucket「${bucket}」可访问` };
  }

  private async saveDataUrlToStorage(dataUrl: string, options: { userId?: string; kind: 'input' | 'generated' | 'avatar' | 'template-cover'; retentionDays?: number }) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
    if (!match) throw new BadRequestException('Only jpeg, png, and webp data URLs are supported');
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('Image must be between 1 byte and 15MB');
    return this.saveBuffer(options.userId, buffer, match[1].toLowerCase(), options.kind, options.retentionDays);
  }

  private async saveBuffer(userId: string | undefined, buffer: Buffer, mimeType: string, kind: 'input' | 'generated' | 'avatar' | 'template-cover', retentionDays?: number) {
    const extension = extname(`file.${mimeType.split('/')[1]}`);
    const storageKey = `${kind}/${userId ? `${userId}/` : ''}${randomUUID()}${extension}`;
    const assetId = randomUUID();
    const config = await this.getStorageConfig();
    if (config?.enabled && config.provider === 'qiniu') {
      try {
        await this.uploadQiniu(storageKey, buffer, mimeType, config);
        return this.prisma.asset.create({ data: { id: assetId, userId, kind, storageKey, storageProvider: 'qiniu', publicUrl: `${this.publicBaseUrl}/${assetId}`, mimeType, byteSize: buffer.length, expiresAt: retentionDays ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000) : null } });
      } catch (error) {
        if (!config.fallbackLocal) throw error;
      }
    }
    const path = join(this.root, storageKey);
    await mkdir(join(this.root, storageKey, '..'), { recursive: true });
    await writeFile(path, buffer, { flag: 'wx' });
    return this.prisma.asset.create({ data: { id: assetId, userId, kind, storageKey, storageProvider: 'local', publicUrl: `${this.publicBaseUrl}/${assetId}`, mimeType, byteSize: buffer.length, expiresAt: retentionDays ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000) : null } });
  }

  private async uploadQiniu(key: string, buffer: Buffer, mimeType: string, config: { qiniuAccessKey: string | null; qiniuSecretKey: string | null; qiniuBucket: string | null; qiniuRegion: string | null; qiniuDomain: string | null; qiniuPrivate: boolean; qiniuUrlTtlSeconds: number }) {
    if (!config.qiniuAccessKey || !config.qiniuSecretKey || !config.qiniuBucket || !config.qiniuDomain) throw new Error('Qiniu storage is not fully configured');
    const accessKey = this.secrets.decrypt(config.qiniuAccessKey);
    const secretKey = this.secrets.decrypt(config.qiniuSecretKey);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const policy = Buffer.from(JSON.stringify({ scope: `${config.qiniuBucket}:${key}`, deadline, insertOnly: 1 })).toString('base64url');
    const token = `${accessKey}:${this.sign(secretKey, policy)}:${policy}`;
    const form = new FormData();
    form.append('token', token);
    form.append('key', key);
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), key.split('/').pop() ?? 'image');
    const response = await fetch(this.uploadEndpoint(config.qiniuRegion), { method: 'POST', body: form });
    if (!response.ok) throw new Error(`Qiniu upload failed with status ${response.status}`);
    return this.getQiniuUrl(key, config);
  }

  private async getQiniuUrl(key: string, supplied?: { qiniuAccessKey: string | null; qiniuSecretKey: string | null; qiniuDomain: string | null; qiniuPrivate: boolean; qiniuUrlTtlSeconds: number }) {
    const config = supplied ?? await this.getStorageConfig();
    if (!config?.qiniuDomain) return `${this.publicBaseUrl}/${key}`;
    const base = `${config.qiniuDomain.replace(/\/$/, '')}/${key}`;
    if (!config.qiniuPrivate) return base;
    if (!config.qiniuAccessKey || !config.qiniuSecretKey) throw new Error('Qiniu private URL signing is not configured');
    const accessKey = this.secrets.decrypt(config.qiniuAccessKey);
    const secretKey = this.secrets.decrypt(config.qiniuSecretKey);
    const signed = `${base}?e=${Math.floor(Date.now() / 1000) + config.qiniuUrlTtlSeconds}`;
    return `${signed}&token=${accessKey}:${this.sign(secretKey, signed)}`;
  }

  private uploadEndpoint(region?: string | null) { return ({ as0: 'https://up-as0.qiniup.com', z0: 'https://up-z0.qiniup.com', z1: 'https://up-z1.qiniup.com', z2: 'https://up-z2.qiniup.com', na0: 'https://up-na0.qiniup.com' } as Record<string, string>)[region ?? 'as0'] ?? 'https://up-as0.qiniup.com'; }
  private sign(secret: string, value: string) { return createHmac('sha1', secret).update(value).digest('base64url'); }
}
