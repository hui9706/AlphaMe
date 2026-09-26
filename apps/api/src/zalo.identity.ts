import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

export type ZaloIdentity = { openId: string; displayName?: string; avatarUrl?: string };

@Injectable()
export class ZaloIdentityProvider {
  constructor(private readonly config: ConfigService) {}

  async getIdentity(accessToken: string): Promise<ZaloIdentity> {
    const appSecret = this.config.get<string>('ZALO_APP_SECRET');
    if (!appSecret) throw new ServiceUnavailableException('ZALO_APP_SECRET is not configured');
    const appsecretProof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
    const url = new URL('https://graph.zalo.me/v2.0/me');
    url.searchParams.set('fields', 'id');
    const response = await fetch(url, { headers: { access_token: accessToken, appsecret_proof: appsecretProof } });
    const payload = await response.json() as { id?: string; error?: number };
    if (!response.ok || payload.error || !payload.id) throw new UnauthorizedException('Zalo authentication failed');
    return { openId: payload.id };
  }
}
