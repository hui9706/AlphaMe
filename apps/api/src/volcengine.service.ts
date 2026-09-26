import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SecretsService } from './secrets.service';
import { createHash, createHmac } from 'node:crypto';

type UsageDetail = { Time: number; ObjectName: string; Usage: number; Unit: string; BillingType: string };

@Injectable()
export class VolcengineService {
  constructor(private readonly prisma: PrismaService, private readonly secrets: SecretsService) {}

  async config() {
    const value = await this.prisma.volcengineConfig.findUnique({ where: { id: 'default' } });
    return { configured: Boolean(value?.accessKey && value?.secretKey), region: value?.region ?? 'cn-beijing' };
  }

  async saveConfig(input: { accessKey?: string; secretKey?: string; region?: string }) {
    const current = await this.prisma.volcengineConfig.findUnique({ where: { id: 'default' } });
    const value = await this.prisma.volcengineConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', accessKey: input.accessKey ? this.secrets.encrypt(input.accessKey) : null, secretKey: input.secretKey ? this.secrets.encrypt(input.secretKey) : null, region: input.region || 'cn-beijing' },
      update: { accessKey: input.accessKey ? this.secrets.encrypt(input.accessKey) : current?.accessKey, secretKey: input.secretKey ? this.secrets.encrypt(input.secretKey) : current?.secretKey, region: input.region || current?.region || 'cn-beijing' },
    });
    return { configured: Boolean(value.accessKey && value.secretKey), region: value.region };
  }

  async testConnection() {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    await this.getUsage(this.date(start), this.date(end));
    return { ok: true, message: '火山引擎 AK/SK 连通正常' };
  }

  async getUsage(startDate: string, endDate: string) {
    const value = await this.prisma.volcengineConfig.findUnique({ where: { id: 'default' } });
    if (!value?.accessKey || !value.secretKey) throw new ServiceUnavailableException('请先配置火山引擎 AK/SK');
    const region = value.region || 'cn-beijing';
    const host = 'ark.cn-beijing.volcengineapi.com';
    const body = JSON.stringify({ QueryInterval: 'Day', Filter: { StartTime: startDate, EndTime: endDate } });
    const payload = await this.request(host, region, this.secrets.decrypt(value.accessKey), this.secrets.decrypt(value.secretKey), body);
    const details = (payload?.Result?.Details ?? []) as UsageDetail[];
    const totals = details.reduce<Record<string, number>>((result, item) => { const key = `${item.ObjectName}·${item.Unit}`; result[key] = (result[key] ?? 0) + Number(item.Usage || 0); return result; }, {});
    return { startDate, endDate, details, totals };
  }

  private async request(host: string, region: string, accessKey: string, secretKey: string, body: string) {
    const method = 'POST';
    const uri = '/';
    const query = 'Action=GetUsageDetails&Version=2024-01-01';
    const date = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const shortDate = date.slice(0, 8);
    const contentHash = createHash('sha256').update(body).digest('hex');
    const signedHeaders = 'content-type;host;x-content-sha256;x-date';
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-content-sha256:${contentHash}\nx-date:${date}\n`;
    const canonicalRequest = [method, uri, query, canonicalHeaders, signedHeaders, contentHash].join('\n');
    const credentialScope = `${shortDate}/${region}/ark/request`;
    const stringToSign = ['HMAC-SHA256', date, credentialScope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const kDate = createHmac('sha256', `VOLC${secretKey}`).update(shortDate).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('ark').digest();
    const kSigning = createHmac('sha256', kService).update('request').digest();
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const response = await fetch(`https://${host}/?${query}`, { method, headers: { 'Content-Type': 'application/json', Host: host, 'X-Content-Sha256': contentHash, 'X-Date': date, Authorization: `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}` }, body });
    const payload = await response.json().catch(() => ({})) as { ResponseMetadata?: { Error?: { Code?: string; Message?: string } }; Result?: { Details?: UsageDetail[] } };
    if (!response.ok || payload.ResponseMetadata?.Error) throw new ServiceUnavailableException(payload.ResponseMetadata?.Error?.Message || `火山引擎用量接口返回 ${response.status}`);
    return payload;
  }

  private date(value: Date) { return value.toISOString().slice(0, 10); }
}
