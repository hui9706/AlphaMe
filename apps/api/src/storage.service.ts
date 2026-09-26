import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.root = config.get('UPLOAD_ROOT', './var/uploads');
    this.publicBaseUrl = config.get('PUBLIC_ASSET_BASE_URL', 'http://localhost:3000/v1/assets');
  }

  async saveDataUrl(userId: string, dataUrl: string, kind: 'input' | 'generated') {
    return this.saveDataUrlToStorage(dataUrl, { userId, kind, retentionDays: kind === 'input' ? 3 / 24 : 30 });
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
    return { asset, path: join(this.root, asset.storageKey) };
  }

  private async saveDataUrlToStorage(dataUrl: string, options: { userId?: string; kind: 'input' | 'generated' | 'template-cover'; retentionDays?: number }) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
    if (!match) throw new BadRequestException('Only jpeg, png, and webp data URLs are supported');
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('Image must be between 1 byte and 15MB');
    return this.saveBuffer(options.userId, buffer, match[1].toLowerCase(), options.kind, options.retentionDays);
  }

  private async saveBuffer(userId: string | undefined, buffer: Buffer, mimeType: string, kind: 'input' | 'generated' | 'template-cover', retentionDays?: number) {
    const extension = extname(`file.${mimeType.split('/')[1]}`);
    const storageKey = `${kind}/${userId ? `${userId}/` : ''}${randomUUID()}${extension}`;
    const path = join(this.root, storageKey);
    await mkdir(join(this.root, storageKey, '..'), { recursive: true });
    await writeFile(path, buffer, { flag: 'wx' });
    const assetId = randomUUID();
    const asset = await this.prisma.asset.create({ data: { id: assetId, userId, kind, storageKey, publicUrl: `${this.publicBaseUrl}/${assetId}`, mimeType, byteSize: buffer.length, expiresAt: retentionDays ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000) : null } });
    return asset;
  }
}
