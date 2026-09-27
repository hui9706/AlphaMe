import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ZaloIdentity = { openId: string; displayName?: string; avatarUrl?: string };
type ZaloFriendListPayload = {
  error?: number;
  message?: string;
  data?: Record<string, { error?: number; message?: string; user_info?: { user_id_by_app?: string } }>;
};

@Injectable()
export class ZaloIdentityProvider {
  private readonly logger = new Logger(ZaloIdentityProvider.name);

  constructor(private readonly config: ConfigService) {}

  async getIdentity(accessToken: string): Promise<ZaloIdentity> {
    const url = new URL('https://graph.zalo.me/v2.0/me');
    url.searchParams.set('fields', 'id');
    const miniAppId = this.config.get<string>('ZALO_APP_ID');
    if (miniAppId) url.searchParams.set('miniapp_id', miniAppId);
    const response = await fetch(url, { headers: { access_token: accessToken } });
    const payload = await response.json() as { id?: string; error?: number; message?: string };
    if (!response.ok || payload.error || !payload.id) {
      this.logger.warn(`Zalo identity verification failed: HTTP ${response.status}, error ${payload.error ?? 'unknown'}, ${payload.message ?? 'no message'}`);
      throw new UnauthorizedException('Zalo authentication failed');
    }
    return { openId: payload.id };
  }

  async assertFriend(accessToken: string, targetOpenId: string): Promise<void> {
    const response = await fetch('https://graph.zalo.me/v2.0/me/friends/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: accessToken },
      body: JSON.stringify({ fields: 'id', user_ids: [targetOpenId] }),
    });
    const payload = await response.json() as ZaloFriendListPayload;
    if (!response.ok || payload.error) {
      this.logger.warn(`Zalo friend verification failed: HTTP ${response.status}, error ${payload.error ?? 'unknown'}, ${payload.message ?? 'no message'}`);
      throw new UnauthorizedException('Zalo friend verification failed');
    }
    const result = payload.data?.[targetOpenId];
    if (!result || result.error || result.user_info?.user_id_by_app !== targetOpenId) {
      throw new ForbiddenException('Zalo friend relationship is required');
    }
  }
}
