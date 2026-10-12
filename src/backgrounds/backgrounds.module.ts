import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, type AppConfig } from '../app.config.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaFiles } from '../books/media-files.js';
import { AppBackground } from './background.entity.js';
import {
  AdminBackgroundsController,
  BackgroundsController,
} from './backgrounds.controller.js';
import { BackgroundsService } from './backgrounds.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppBackground]), AuthModule],
  controllers: [BackgroundsController, AdminBackgroundsController],
  providers: [
    BackgroundsService,
    {
      provide: MediaFiles,
      inject: [appConfig.KEY],
      useFactory: ({ mediaRoot }: AppConfig) => new MediaFiles(mediaRoot),
    },
  ],
})
export class BackgroundsModule {}
