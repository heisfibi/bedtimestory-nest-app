import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/admin.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import {
  AdminAppVersionController,
  AppVersionController,
} from './app-version.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), AuthModule, SettingsModule],
  controllers: [AppVersionController, AdminAppVersionController],
})
export class AppVersionModule {}
