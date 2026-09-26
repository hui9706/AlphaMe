import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ZaloIdentity = { openId: string; displayName?: string; avatarUrl?: string };

@Injectable()
export class ZaloIdentityProvider {
  constructor(private readonly config: ConfigService) {}

  async exchange(authCode: string, authCodeVerify: string): Promise<ZaloIdentity> {
    const url = this.config.get<string>('ZALO_AUTH_EXCHANGE_URL');
    if (!url) throw new ServiceUnavailableException('ZALO_AUTH_EXCHANGE_URL is not configured');
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: this.config.get('ZALO_APP_ID'), app_secret: this.config.get('ZALO_APP_SECRET'), auth_code: authCode, auth_code_verify: authCodeVerify }) });
    const payload = await response.json() as { open_id?: string; user_id?: string; display_name?: string; name?: string; avatar_url?: string; error?: string };
    if (!response.ok || (!payload.open_id && !payload.user_id)) throw new UnauthorizedException(payload.error ?? 'Zalo authentication failed');
    return { openId: payload.open_id ?? payload.user_id!, displayName: payload.display_name ?? payload.name, avatarUrl: payload.avatar_url };
  }
}
