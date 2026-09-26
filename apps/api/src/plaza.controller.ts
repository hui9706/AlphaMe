import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PlazaService } from './plaza.service';

class PublishPlazaWorkDto { @IsString() @MinLength(1) generationId!: string; }

@Controller('plaza/works')
export class PlazaController {
  constructor(private readonly plaza: PlazaService) {}

  @Get()
  list(@Req() request: { userId?: string }, @Query('limit') limit?: string) { return this.plaza.list(request.userId, Number(limit ?? 30)); }

  @Post()
  @UseGuards(AuthGuard)
  publish(@Body() body: PublishPlazaWorkDto, @Req() request: { userId?: string }) { return this.plaza.publish(request.userId!, body.generationId); }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  like(@Param('id') id: string, @Req() request: { userId?: string }) { return this.plaza.like(request.userId!, id); }

  @Delete(':id/like')
  @UseGuards(AuthGuard)
  unlike(@Param('id') id: string, @Req() request: { userId?: string }) { return this.plaza.unlike(request.userId!, id); }
}
