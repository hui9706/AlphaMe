import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { StorageService } from './storage.service';

class LoginDto { @IsString() @MinLength(1) username!: string; @IsString() @MinLength(8) password!: string; }
class TemplateDto { @IsString() @MinLength(1) slug!: string; @IsString() @MinLength(1) nameVi!: string; @IsString() @MinLength(1) nameZh!: string; @IsString() @MinLength(1) prompt!: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; }
class TemplatePatchDto { @IsOptional() @IsString() nameVi?: string; @IsOptional() @IsString() nameZh?: string; @IsOptional() @IsString() prompt?: string; @IsOptional() @IsInt() @Min(0) coinCost?: number; @IsOptional() @IsString() coverUrl?: string; @IsOptional() @IsBoolean() enabled?: boolean; }
class TemplateReorderDto { @IsArray() @ArrayNotEmpty() @IsString({ each: true }) templateIds!: string[]; }
class ApiKeyDto { @IsString() @MinLength(1) label!: string; @IsString() @MinLength(1) value!: string; @IsOptional() @IsInt() @Min(0) priority?: number; }
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

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly storage: StorageService) {}

  @Post('auth/login') login(@Body() body: LoginDto) { return this.admin.login(body.username, body.password); }

  @Get('stats') @UseGuards(AdminGuard) stats() { return this.admin.stats(); }
  @Get('users') @UseGuards(AdminGuard) users(@Query('limit') limit?: string) { return this.admin.users(Number(limit ?? 50)); }
  @Get('generations') @UseGuards(AdminGuard) generations(@Query('limit') limit?: string) { return this.admin.generations(Number(limit ?? 50)); }
  @Get('templates') @UseGuards(AdminGuard) templates() { return this.admin.templates(); }
  @Post('template-covers') @UseGuards(AdminGuard) uploadTemplateCover(@Body() body: TemplateCoverUploadDto) { return this.storage.saveTemplateCover(body.dataUrl); }
  @Post('templates') @UseGuards(AdminGuard) createTemplate(@Body() body: TemplateDto) { return this.admin.createTemplate(body); }
  @Patch('templates/order') @UseGuards(AdminGuard) reorderTemplates(@Body() body: TemplateReorderDto) { return this.admin.reorderTemplates(body.templateIds); }
  @Patch('templates/:id') @UseGuards(AdminGuard) updateTemplate(@Param('id') id: string, @Body() body: TemplatePatchDto) { return this.admin.updateTemplate(id, body); }
  @Get('api-keys') @UseGuards(AdminGuard) apiKeys() { return this.admin.apiKeys(); }
  @Post('api-keys') @UseGuards(AdminGuard) createApiKey(@Body() body: ApiKeyDto) { return this.admin.createApiKey(body.label, body.value, body.priority); }
  @Patch('api-keys/:id') @UseGuards(AdminGuard) updateApiKey(@Param('id') id: string, @Body() body: { priority?: number; status?: 'ACTIVE' | 'PAUSED' }) { return this.admin.updateApiKey(id, body); }
  @Get('storage') @UseGuards(AdminGuard) async storageConfig() {
    const config = await this.storage.getStorageConfig();
    return config ? { ...config, qiniuAccessKey: Boolean(config.qiniuAccessKey), qiniuSecretKey: Boolean(config.qiniuSecretKey) } : { provider: 'local', enabled: false, fallbackLocal: true, qiniuPrivate: true, qiniuUrlTtlSeconds: 2592000 };
  }
  @Patch('storage') @UseGuards(AdminGuard) updateStorage(@Body() body: StorageConfigDto) { return this.storage.saveStorageConfig(body).then((config) => ({ ...config, qiniuAccessKey: Boolean(config.qiniuAccessKey), qiniuSecretKey: Boolean(config.qiniuSecretKey) })); }
  @Post('storage/test') @UseGuards(AdminGuard) testStorage(@Body() body: StorageTestDto) { return this.storage.testQiniuConnection(body); }
}
