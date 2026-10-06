import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('home')
export class HomeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('hero-images')
  async heroImages() {
    return await this.prisma.homeHeroImages.findUnique({ where: { id: 'default' }, select: { leftUrl: true, centerUrl: true, rightUrl: true } })
      ?? { leftUrl: '', centerUrl: '', rightUrl: '' };
  }
}
