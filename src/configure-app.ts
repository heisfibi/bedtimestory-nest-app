import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { appConfig, type AppConfig } from './app.config.js';

// Shared by main.ts and the e2e tests so both run the same app.
export function configureApp(app: NestExpressApplication) {
  const { mediaRoot } = app.get<AppConfig>(appConfig.KEY);
  // On Railway https ends at its proxy, and requests arrive here as plain
  // http. Trusting the one proxy in front makes request.protocol https (so the
  // links to books, pictures and music are too: store builds of the app refuse
  // http) and request.ip the caller's own rather than the proxy's.
  app.set('trust proxy', 1);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useStaticAssets(mediaRoot, { prefix: '/media/' });
  return app;
}
