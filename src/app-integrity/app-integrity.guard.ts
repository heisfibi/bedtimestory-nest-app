import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppIntegrityService } from './app-integrity.service.js';

/** The header the app sends its app token in, and the one that tells it to get one. */
export const APP_TOKEN_HEADER = 'x-app-token';
export const APP_CHECK_HEADER = 'x-app-integrity';

/**
 * Lets only our own app (with a good app token, see AppIntegrityService)
 * reach the app's endpoints while APP_INTEGRITY_REQUIRED is true. Turned
 * away, the app is told to get verified and try again.
 */
@Injectable()
export class AppIntegrityGuard implements CanActivate {
  constructor(private readonly integrity: AppIntegrityService) {}

  canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    const token = http.getRequest<Request>().header(APP_TOKEN_HEADER);
    if (this.integrity.allows(token)) return true;
    http.getResponse<Response>().setHeader(APP_CHECK_HEADER, 'required');
    throw new UnauthorizedException('This app has not been verified');
  }
}
