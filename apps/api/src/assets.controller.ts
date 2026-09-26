import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { StorageService } from './storage.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':id')
  async get(@Param('id') id: string, @Res() response: any) {
    const asset = await this.storage.readById(id);
    if (!asset) throw new NotFoundException('Asset not found');
    response.setHeader('Content-Type', asset.asset.mimeType);
    response.setHeader('Content-Length', String(asset.asset.byteSize));
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=3600');
    createReadStream(asset.path).pipe(response);
  }
}
