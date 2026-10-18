import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/admin.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  AdminLegalController,
  LegalController,
  LegalPagesController,
} from './legal.controller.js';
import { LegalVersion } from './legal-version.entity.js';
import { LegalService } from './legal.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([LegalVersion, Admin]), AuthModule],
  controllers: [LegalPagesController, LegalController, AdminLegalController],
  providers: [LegalService],
})
export class LegalModule {}
