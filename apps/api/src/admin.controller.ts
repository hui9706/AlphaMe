import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { StorageService } from './storage.service';
import { VolcengineService } from './volcengine.service';

class LoginDto { @IsString() @MinLength(1) username!: string; @IsString() @MinLength(8) password!: string; }
class TemplateDto { @IsString() @MinLength(1) slug!: string; @IsString() @MinLength(1) nameVi!: string; @IsString() @MinLength(1) nameZh!: string; @IsString() @MinLength(1) prompt!: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; }
class TemplatePatchDto { @IsOptional() @IsString() nameVi?: string; @IsOptional() @IsString() nameZh?: string; @IsOptional() @IsString() prompt?: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; @IsOptional() @IsBoolean() enabled?: boolean; }
class TemplateReorderDto { @IsArray() @ArrayNotEmpty() @IsString({ each: true }) templateIds!: string[]; }
class ApiKeyDto { @IsString() @MinLength(1) label!: string; @IsString() @MinLength(1) value!: string; @IsOptional() @IsInt() @Min(0) priority?: number; }
class VolcengineConfigDto { @IsOptional() @IsString() accessKey?: string; @IsOptional() @IsString() secretKey?: string; @IsOptional() @IsString() region?: string; }
class TemplateCoverUploadDto { @IsString() @MinLength(20) dataUrl!: string; }
class StorageConfigDto {
  @IsString() provider!: string;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() qiniuAccessKey?: string;
  @IsOptional() @IsString() qiniuSecretKey?: string;
  @IsOptional() @IsString() qiniuBucket?: string;
  @IsOptional() @IsString() qiniuRegion?: string;
  @IsOptional() @IsString() qiniuDomain?: string;
  @IsOptional() @IsBoolean() qiniuPrivate?: boolean;
  @IsOptional() @IsInt() @Min(300) qiniuUrlTtlSeconds?: number;
  @IsOptional() @IsBoolean() fallbackLocal?: boolean;
}
class StorageTestDto {
  @IsOptional() @IsString() qiniuAccessKey?: string;
  @IsOptional() @IsString() qiniuSecretKey?: string;
  @IsOptional() @IsString() qiniuBucket?: string;
}
class CoinAdjustmentDto { @IsInt() @Min(-1000000) @Max(1000000) amount!: number; @IsString() @MinLength(1) note!: string; @IsString() @MinLength(1) idempotencyKey!: string; }
class RewardRevokeDto { @IsString() @MinLength(1) reason!: string; }

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly storage: StorageService, private readonly volcengine: VolcengineService) {}

  @Post('auth/login') login(@Body() body: LoginDto) { return this.admin.login(body.username, body.password); }

  @Get('stats') @UseGuards(AdminGuard) stats() { return this.admin.stats(); }
  @Get('users') @UseGuards(AdminGuard) users(@Query('limit') limit?: string) { return this.admin.users(Number(limit ?? 50)); }
  @Get('users/:id/coins') @UseGuards(AdminGuard) coinAccount(@Param('id') id: string, @Query('limit') limit?: string) { return this.admin.coinAccount(id, Number(limit ?? 100)); }
  @Post('users/:id/coins/adjust') @UseGuards(AdminGuard) adjustCoin(@Param('id') id: string, @Body() body: CoinAdjustmentDto, @Req() request: { adminId?: string }) { return this.admin.adjustCoin(id, body.amount, body.note, body.idempotencyKey, request.adminId!); }
  @Get('rewards') @UseGuards(AdminGuard) rewards(@Query('userId') userId?: string, @Query('status') status?: 'GRANTED' | 'REVOKED' | 'BLOCKED', @Query('limit') limit?: string) { return this.admin.rewards(userId, status, Number(limit ?? 100)); }
  @Post('rewards/:id/revoke') @UseGuards(AdminGuard) revokeReward(@Param('id') id: string, @Body() body: RewardRevokeDto, @Req() request: { adminId?: string }) { return this.admin.revokeReward(id, request.adminId!, body.reason); }
  @Get('generations') @UseGuards(AdminGuard) generations(@Query('limit') limit?: string) { return this.admin.generations(Number(limit ?? 50)); }
  @Get('templates') @UseGuards(AdminGuard) templates() { return this.admin.templates(); }
  @Post('template-covers') @UseGuards(AdminGuard) uploadTemplateCover(@Body() body: TemplateCoverUploadDto) { return this.storage.saveTemplateCover(body.dataUrl); }
  @Post('templates') @UseGuards(AdminGuard) createTemplate(@Body() body: TemplateDto) { return this.admin.createTemplate(body); }
  @Patch('templates/order') @UseGuards(AdminGuard) reorderTemplates(@Body() body: TemplateReorderDto) { return this.admin.reorderTemplates(body.templateIds); }
  @Patch('templates/:id') @UseGuards(AdminGuard) updateTemplate(@Param('id') id: string, @Body() body: TemplatePatchDto) { return this.admin.updateTemplate(id, body); }
  @Get('api-keys') @UseGuards(AdminGuard) apiKeys() { return this.admin.apiKeys(); }
  @Post('api-keys') @UseGuards(AdminGuard) createApiKey(@Body() body: ApiKeyDto) { return this.admin.createApiKey(body.label, body.value, body.priority); }
  @Patch('api-keys/:id') @UseGuards(AdminGuard) updateApiKey(@Param('id') id: string, @Body() body: { priority?: number; status?: 'ACTIVE' | 'PAUSED' }) { return this.admin.updateApiKey(id, body); }
  @Get('volcengine/config') @UseGuards(AdminGuard) volcengineConfig() { return this.volcengine.config(); }
  @Patch('volcengine/config') @UseGuards(AdminGuard) updateVolcengineConfig(@Body() body: VolcengineConfigDto) { return this.volcengine.saveConfig(body); }
  @Post('volcengine/test') @UseGuards(AdminGuard) testVolcengine() { return this.volcengine.testConnection(); }
  @Get('volcengine/usage') @UseGuards(AdminGuard) volcengineUsage(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const start = startDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return this.volcengine.getUsage(start, end);
  }
  @Get('storage') @UseGuards(AdminGuard) async storageConfig() {
    const config = await this.storage.getStorageConfig();
    return config ? { ...config, qiniuAccessKey: Boolean(config.qiniuAccessKey), qiniuSecretKey: Boolean(config.qiniuSecretKey) } : { provider: 'local', enabled: false, fallbackLocal: true, qiniuPrivate: true, qiniuUrlTtlSeconds: 2592000 };
  }
  @Patch('storage') @UseGuards(AdminGuard) updateStorage(@Body() body: StorageConfigDto) { return this.storage.saveStorageConfig(body).then((config) => ({ ...config, qiniuAccessKey: Boolean(config.qiniuAccessKey), qiniuSecretKey: Boolean(config.qiniuSecretKey) })); }
  @Post('storage/test') @UseGuards(AdminGuard) testStorage(@Body() body: StorageTestDto) { return this.storage.testQiniuConnection(body); }
}
