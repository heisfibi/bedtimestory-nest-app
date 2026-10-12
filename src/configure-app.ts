import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { appConfig, type AppConfig } from './app.config.js';

// Shared by main.ts and the e2e tests so both run the same app.
export function configureApp(app: NestExpressApplication) {
  const { mediaRoot } = app.get<AppConfig>(appConfig.KEY);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useStaticAssets(mediaRoot, { prefix: '/media/' });
  return app;
}
