import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

class ZaloLoginDto {
  @IsString()
  @MinLength(1)
  authCode!: string;

  @IsString()
  @MinLength(1)
  authCodeVerify!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('zalo')
  login(@Body() body: ZaloLoginDto) { return this.auth.exchangeZaloCode(body.authCode, body.authCodeVerify); }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: { userId?: string }) { return this.auth.getMe(request.userId!); }
}
