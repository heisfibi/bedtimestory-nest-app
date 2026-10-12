import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { Admin } from './admin.entity.js';

type AuthedRequest = Request & { admin?: Admin };

const SUPER_ADMIN_ONLY = 'superAdminOnly';

/** Restricts a route (or controller) to super admins. Needs AdminAuthGuard. */
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_ONLY, true);

/** The signed-in admin, set by AdminAuthGuard. */
export const CurrentAdmin = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().admin!,
);

/**
 * Requires `Authorization: Bearer <session token>` for an active admin. The
 * admin is reloaded on every request, so deactivating an account or changing
 * its role takes effect immediately.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sign in to continue');

    let payload: { sub: number; v: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }

    const admin = await this.admins.findOneBy({ id: payload.sub });
    if (!admin?.active || payload.v !== admin.sessionVersion) {
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }

    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY,
      [context.getHandler(), context.getClass()],
    );
    if (superAdminOnly && admin.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can do this');
    }

    request.admin = admin;
    return true;
  }
}
