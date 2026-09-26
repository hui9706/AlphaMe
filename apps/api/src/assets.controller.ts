import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { StorageService } from './storage.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':id')
  async get(@Param('id') id: string, @Res() response: any) {
    const asset = await this.storage.readById(id);
    if (!asset) throw new NotFoundException('Asset not found');
    let fileInfo;
    try {
      fileInfo = await stat(asset.path);
    } catch {
      throw new NotFoundException('Asset file not found');
    }
    if (!fileInfo.isFile()) throw new NotFoundException('Asset file not found');
    response.setHeader('Content-Type', asset.asset.mimeType);
    // Use the actual file size. The database byteSize can be stale after a
    // manual migration or a restored upload directory, and an incorrect
    // Content-Length makes nginx report 502 when the stream closes early.
    response.setHeader('Content-Length', String(fileInfo.size));
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = createReadStream(asset.path);
    stream.on('error', () => {
      if (!response.headersSent) response.status(404).end();
      else response.destroy();
    });
    stream.pipe(response);
  }
}
