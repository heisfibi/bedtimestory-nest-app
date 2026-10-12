import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request } from 'express';
import { appConfig, type AppConfig } from '../app.config.js';
import { Admin } from './admin.entity.js';
import { AdminsController, AuthController } from './auth.controller.js';
import { AdminAuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    JwtModule.registerAsync({
      inject: [appConfig.KEY],
      useFactory: ({ jwtSecret, sessionTtl }: AppConfig) => {
        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET is not set. Add a long random value to .env.',
          );
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: sessionTtl as `${number}d` },
        };
      },
    }),
    // Sign-in attempts per email, so guessing one account's password is slow.
    // (Requests arrive through the web app's proxy, so the IP alone would
    // lump every admin together.)
    ThrottlerModule.forRoot([
      {
        ttl: 15 * 60_000,
        limit: 10,
        getTracker: (req: Record<string, unknown>) => {
          const request = req as unknown as Request;
          const email = (request.body as { email?: unknown } | undefined)
            ?.email;
          return `${request.ip}:${typeof email === 'string' ? email.toLowerCase() : ''}`;
        },
      },
    ]),
  ],
  controllers: [AuthController, AdminsController],
  providers: [AuthService, AdminAuthGuard],
  exports: [AdminAuthGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
