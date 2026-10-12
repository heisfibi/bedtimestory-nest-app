import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { appConfig, type AppConfig } from './app.config.js';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = configureApp(
    await NestFactory.create<NestExpressApplication>(AppModule),
  );
  const { port } = app.get<AppConfig>(appConfig.KEY);
  // 0.0.0.0 so phones and emulators on the LAN can reach it.
  await app.listen(port, '0.0.0.0');
  Logger.log(`Listening on http://0.0.0.0:${port}`, 'Bootstrap');
}
await bootstrap();
