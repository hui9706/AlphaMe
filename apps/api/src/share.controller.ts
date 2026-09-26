import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { ShareService } from './share.service';

class CreateShareDto { @IsString() @MinLength(1) generationId!: string; }

@Controller('shares')
@UseGuards(AuthGuard)
export class ShareController {
  constructor(private readonly shares: ShareService) {}

  @Post()
  create(@Body() body: CreateShareDto, @Req() request: { userId?: string }) { return this.shares.create(request.userId!, body.generationId); }

  @Post(':token/open')
  open(@Param('token') token: string, @Req() request: { userId?: string }) { return this.shares.open(request.userId!, token); }
}
