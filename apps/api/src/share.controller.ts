import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { ShareService } from './share.service';

@Controller('shares')
@UseGuards(AuthGuard)
export class ShareController {
  constructor(private readonly shares: ShareService) {}

  @Post()
  create(@Req() request: { userId?: string }) { return this.shares.create(request.userId!); }

  @Post(':token/open')
  open(@Param('token') token: string, @Req() request: { userId?: string }) { return this.shares.open(request.userId!, token); }
}
