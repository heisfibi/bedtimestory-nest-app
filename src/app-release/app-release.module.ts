import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/admin.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  AdminAppReleaseController,
  AppReleaseController,
} from './app-release.controller.js';
import { AppRelease } from './app-release.entity.js';
import { AppReleaseService } from './app-release.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppRelease, Admin]), AuthModule],
  controllers: [AppReleaseController, AdminAppReleaseController],
  providers: [AppReleaseService],
})
export class AppReleaseModule {}
