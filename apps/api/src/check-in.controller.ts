import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CheckInService } from './check-in.service';

@Controller('coins/check-in')
@UseGuards(AuthGuard)
export class CheckInController {
  constructor(private readonly checkIn: CheckInService) {}

  @Get('status') status(@Req() request: { userId?: string }) { return this.checkIn.status(request.userId!); }
  @Post() checkInNow(@Req() request: { userId?: string }) { return this.checkIn.checkIn(request.userId!); }
}
