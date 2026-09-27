import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

class ZaloLoginDto {
  @IsString()
  @MinLength(1)
  accessToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string;
}

class CredentialsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

class ProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('zalo')
  login(@Body() body: ZaloLoginDto) { return this.auth.loginWithZalo(body.accessToken, { displayName: body.displayName, avatarUrl: body.avatarUrl }); }

  @Post('register')
  register(@Body() body: CredentialsDto) { return this.auth.register(body.username, body.password); }

  @Post('login')
  loginWithCredentials(@Body() body: CredentialsDto) { return this.auth.loginWithCredentials(body.username, body.password); }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: { userId?: string }) { return this.auth.getMe(request.userId!); }

  @Post('profile')
  @UseGuards(AuthGuard)
  updateProfile(@Body() body: ProfileDto, @Req() request: { userId?: string }) {
    const displayName = body.displayName.trim();
    if (!displayName) throw new BadRequestException('Display name is required');
    return this.auth.updateProfile(request.userId!, displayName, body.avatarUrl);
  }
}
