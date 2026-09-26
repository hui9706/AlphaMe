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
    response.setHeader('Cache-Control', 'public, max-age=3600');
    createReadStream(asset.path).pipe(response);
  }
}
