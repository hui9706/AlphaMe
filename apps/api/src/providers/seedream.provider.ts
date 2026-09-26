import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyPool } from './api-key.pool';

@Injectable()
export class SeedreamProvider {
  constructor(private readonly keys: ApiKeyPool, private readonly config: ConfigService) {}

  async createImage(input: { prompt: string; sourceAssetUrl: string }) {
    const endpoint = this.config.get('SEEDREAM_ENDPOINT', 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
    const model = this.config.get('SEEDREAM_MODEL');
    if (!model) throw new ServiceUnavailableException('SEEDREAM_MODEL is not configured');
    let lastError = 'Seedream request failed';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const key = await this.keys.next();
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.token}` }, body: JSON.stringify({ model, prompt: input.prompt, image: input.sourceAssetUrl, size: this.config.get('SEEDREAM_SIZE', '2K'), output_format: this.config.get('SEEDREAM_OUTPUT_FORMAT', 'jpeg'), response_format: 'url', sequential_image_generation: 'disabled' }) });
      if (response.ok) {
        const payload = await response.json() as { data?: Array<{ url?: string }> };
        const url = payload.data?.[0]?.url;
        if (url) return { url };
        throw new Error('Seedream response did not contain an image URL');
      }
      lastError = `Seedream returned ${response.status}`;
      if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
      await this.keys.reportFailure(key.id, response.status);
    }
    throw new Error(lastError);
  }
}
