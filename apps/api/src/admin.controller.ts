import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { StorageService } from './storage.service';
import { VolcengineService } from './volcengine.service';

class LoginDto { @IsString() @MinLength(1) username!: string; @IsString() @MinLength(8) password!: string; }
class TemplateDto { @IsString() @MinLength(1) slug!: string; @IsString() @MinLength(1) nameVi!: string; @IsString() @MinLength(1) nameZh!: string; @IsString() @MinLength(1) prompt!: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; }
class TemplatePatchDto { @IsOptional() @IsString() nameVi?: string; @IsOptional() @IsString() nameZh?: string; @IsOptional() @IsString() prompt?: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; @IsOptional() @IsBoolean() enabled?: boolean; }
class TemplateReorderDto { @IsArray() @ArrayNotEmpty() @IsString({ each: true }) templateIds!: string[]; }
class TemplateCoverOptimizeDto { @IsArray() @IsString({ each: true }) templateIds!: string[]; }
class ApiKeyDto { @IsString() @MinLength(1) label!: string; @IsString() @MinLength(1) value!: string; @IsOptional() @IsInt() @Min(0) priority?: number; }
class VolcengineConfigDto { @IsOptional() @IsString() accessKey?: string; @IsOptional() @IsString() secretKey?: string; @IsOptional() @IsString() region?: string; }
class TemplateCoverUploadDto { @IsString() @MinLength(20) dataUrl!: string; }
class HomeHeroImagesDto { @IsOptional() @IsString() @MaxLength(2000) leftUrl?: string; @IsOptional() @IsString() @MaxLength(2000) centerUrl?: string; @IsOptional() @IsString() @MaxLength(2000) rightUrl?: string; }
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
class RiskReviewDto { @IsString() status!: 'REVIEWED' | 'CLEARED'; }
class UserAdminStatusDto { @IsBoolean() isAdmin!: boolean; }
class ResetUserPasswordDto { @IsString() @MinLength(8) @MaxLength(128) password!: string; }
class ChangeAdminPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) currentPassword!: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword!: string;
}
class CreateUserDto {
  @IsString() @MinLength(3) @MaxLength(24) @Matches(/^[a-zA-Z0-9._-]+$/) username!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @IsIn(['vi', 'zh']) language?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) initialCoin?: number;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly storage: StorageService, private readonly volcengine: VolcengineService) {}

  @Post('auth/login') login(@Body() body: LoginDto) { return this.admin.login(body.username, body.password); }
  @Patch('auth/password') @UseGuards(AdminGuard) changePassword(@Body() body: ChangeAdminPasswordDto, @Req() request: { adminId?: string }) { return this.admin.changePassword(request.adminId!, body.currentPassword, body.newPassword); }

  @Get('stats') @UseGuards(AdminGuard) stats() { return this.admin.stats(); }
  @Get('users') @UseGuards(AdminGuard) users(@Query('limit') limit?: string) { return this.admin.users(Number(limit ?? 50)); }
  @Post('users') @UseGuards(AdminGuard) createUser(@Body() body: CreateUserDto) { return this.admin.createUser(body); }
  @Patch('users/:id/password') @UseGuards(AdminGuard) resetUserPassword(@Param('id') id: string, @Body() body: ResetUserPasswordDto) { return this.admin.resetUserPassword(id, body.password); }
  @Delete('users/:id') @UseGuards(AdminGuard) async deleteUser(@Param('id') id: string) { await this.storage.deleteUserAssets(id); return this.admin.deleteUser(id); }
  @Patch('users/:id/admin') @UseGuards(AdminGuard) setUserAdminStatus(@Param('id') id: string, @Body() body: UserAdminStatusDto) { return this.admin.setUserAdminStatus(id, body.isAdmin); }
  @Get('users/:id/coins') @UseGuards(AdminGuard) coinAccount(@Param('id') id: string, @Query('limit') limit?: string) { return this.admin.coinAccount(id, Number(limit ?? 100)); }
  @Post('users/:id/coins/adjust') @UseGuards(AdminGuard) adjustCoin(@Param('id') id: string, @Body() body: CoinAdjustmentDto, @Req() request: { adminId?: string }) { return this.admin.adjustCoin(id, body.amount, body.note, body.idempotencyKey, request.adminId!); }
  @Get('rewards') @UseGuards(AdminGuard) rewards(@Query('userId') userId?: string, @Query('status') status?: 'GRANTED' | 'REVOKED' | 'BLOCKED', @Query('limit') limit?: string) { return this.admin.rewards(userId, status, Number(limit ?? 100)); }
  @Get('risk-events') @UseGuards(AdminGuard) riskEvents(@Query('status') status?: 'OPEN' | 'REVIEWED' | 'BLOCKED', @Query('limit') limit?: string) { return this.admin.riskEvents(status, Number(limit ?? 100)); }
  @Patch('risk-events/:id') @UseGuards(AdminGuard) reviewRiskEvent(@Param('id') id: string, @Body() body: RiskReviewDto, @Req() request: { adminId?: string }) { return this.admin.reviewRiskEvent(id, body.status, request.adminId!); }
  @Post('rewards/:id/revoke') @UseGuards(AdminGuard) revokeReward(@Param('id') id: string, @Body() body: RewardRevokeDto, @Req() request: { adminId?: string }) { return this.admin.revokeReward(id, request.adminId!, body.reason); }
  @Get('generations') @UseGuards(AdminGuard) generations(@Query('limit') limit?: string) { return this.admin.generations(Number(limit ?? 50)); }
  @Get('templates') @UseGuards(AdminGuard) templates() { return this.admin.templates(); }
  @Get('templates/covers/scan') @UseGuards(AdminGuard) scanTemplateCovers() { return this.storage.scanTemplateCovers(); }
  @Post('templates/covers/optimize') @UseGuards(AdminGuard) optimizeTemplateCovers(@Body() body: TemplateCoverOptimizeDto) { return this.storage.optimizeTemplateCovers(body.templateIds); }
  @Post('templates/:id/cover/rollback') @UseGuards(AdminGuard) rollbackTemplateCover(@Param('id') id: string) { return this.storage.rollbackTemplateCover(id); }
  @Get('home-hero-images') @UseGuards(AdminGuard) homeHeroImages() { return this.admin.homeHeroImages(); }
  @Patch('home-hero-images') @UseGuards(AdminGuard) updateHomeHeroImages(@Body() body: HomeHeroImagesDto) { return this.admin.updateHomeHeroImages(body); }
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
