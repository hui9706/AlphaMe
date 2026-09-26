import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; adminId?: string; adminRole?: string }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Missing admin bearer token');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; scope?: string; role?: string }>(token);
      if (payload.scope !== 'admin') throw new UnauthorizedException('Admin scope required');
      request.adminId = payload.sub;
      request.adminRole = payload.role;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid admin access token');
    }
  }
}
