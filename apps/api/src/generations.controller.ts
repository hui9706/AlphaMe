import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { GenerationsService } from './generations.service';
import { AuthGuard } from './auth.guard';

class CreateGenerationDto {
  @IsString() @MinLength(1) templateId!: string;
  @IsString() @MinLength(1) sourceAssetUrl!: string;
  @IsOptional() @IsString() @MinLength(1) sourceAssetUrl2?: string;
}

@Controller('generations')
@UseGuards(AuthGuard)
export class GenerationsController {
  constructor(private readonly generations: GenerationsService) {}

  @Post()
  create(@Body() body: CreateGenerationDto, @Headers('idempotency-key') idempotencyKey: string, @Req() request: { userId?: string }) {
    return this.generations.create(request.userId!, { ...body, idempotencyKey: idempotencyKey || randomUUID() });
  }

  @Get()
  list(@Req() request: { userId?: string }, @Query('limit') limit?: string) { return this.generations.list(request.userId!, Number(limit ?? 30)); }

  @Get(':id')
  get(@Req() request: { userId?: string }, @Param('id') id: string) { return this.generations.get(request.userId!, id); }
}
