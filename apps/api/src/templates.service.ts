import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.template.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }); }
  categories() { return this.prisma.templateCategory.findMany({ orderBy: [{ nameZh: 'asc' }, { nameVi: 'asc' }], select: { id: true, nameZh: true, nameVi: true } }); }
}
