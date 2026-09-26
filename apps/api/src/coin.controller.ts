import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CoinService } from './coin.service';

@Controller('coins')
@UseGuards(AuthGuard)
export class CoinController {
  constructor(private readonly coin: CoinService) {}

  @Get('balance')
  balance(@Req() request: { userId?: string }) { return this.coin.balance(request.userId!); }

  @Get('ledger')
  ledger(@Req() request: { userId?: string }, @Query('limit') limit?: string) { return this.coin.ledger(request.userId!, Number(limit ?? 50)); }
}
