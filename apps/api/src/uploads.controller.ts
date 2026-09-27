import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { StorageService } from './storage.service';

class UploadDto {
  @IsString() @MinLength(20) dataUrl!: string;

  @IsString() kind: 'input' | 'avatar' = 'input';
}

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  create(@Body() body: UploadDto, @Req() request: { userId?: string }) {
    return this.storage.saveDataUrl(request.userId!, body.dataUrl, body.kind === 'avatar' ? 'avatar' : 'input');
  }
}
