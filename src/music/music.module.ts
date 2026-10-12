import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, type AppConfig } from '../app.config.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaFiles } from '../books/media-files.js';
import { MusicTrack } from './music-track.entity.js';
import { AdminMusicController, MusicController } from './music.controller.js';
import { MusicService } from './music.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MusicTrack]), AuthModule],
  controllers: [MusicController, AdminMusicController],
  providers: [
    MusicService,
    {
      provide: MediaFiles,
      inject: [appConfig.KEY],
      useFactory: ({ mediaRoot }: AppConfig) => new MediaFiles(mediaRoot),
    },
  ],
})
export class MusicModule {}
