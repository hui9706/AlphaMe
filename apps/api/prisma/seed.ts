import { PrismaClient } from '@prisma/client';
import { AdminService } from '../src/admin.service';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    { slug: 'ao-dai', nameVi: 'Áo Dài', nameZh: '越南奥黛', prompt: 'Vietnamese áo dài editorial portrait', coverUrl: '/templates/ao-dai.jpg' },
    { slug: 'dream-portrait', nameVi: 'Dream Portrait', nameZh: '梦幻肖像', prompt: 'Dreamy studio portrait with soft cinematic light', coverUrl: '/templates/dream-portrait.jpg' },
    { slug: 'movie-poster', nameVi: 'Movie Poster', nameZh: '电影海报', prompt: 'Cinematic movie poster portrait', coverUrl: '/templates/movie-poster.jpg' },
  ];
  for (const template of templates) {
    await prisma.template.upsert({ where: { slug: template.slug }, update: template, create: template });
  }
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (username && password) {
    await prisma.adminUser.upsert({ where: { username }, update: {}, create: { username, passwordHash: AdminService.hashPassword(password), role: 'owner' } });
  }
}

main().finally(() => prisma.$disconnect());
