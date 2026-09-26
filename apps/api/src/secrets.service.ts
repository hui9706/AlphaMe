import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class SecretsService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('ADMIN_ENCRYPTION_KEY', '');
    this.key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.alloc(0);
  }

  encrypt(value: string) {
    if (this.key.length !== 32) throw new InternalServerErrorException('ADMIN_ENCRYPTION_KEY is not configured');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decrypt(value: string) {
    if (this.key.length !== 32) throw new InternalServerErrorException('ADMIN_ENCRYPTION_KEY is not configured');
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
