import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/admin.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { PublishedBook } from '../books/published-book.entity.js';
import {
  AdminUnlockCodeController,
  UnlockCodesController,
} from './unlock-codes.controller.js';
import { UnlockCodesService } from './unlock-codes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, PublishedBook]), AuthModule],
  controllers: [UnlockCodesController, AdminUnlockCodeController],
  providers: [UnlockCodesService],
})
export class UnlockCodesModule {}
