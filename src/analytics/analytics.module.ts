import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Book } from '../books/book.entity.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { Reader, ReaderMonth } from './reader.entity.js';
import { ReadingSession } from './reading-session.entity.js';
import { RevenueMonth, StatementBook } from './revenue-month.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reader,
      ReaderMonth,
      ReadingSession,
      RevenueMonth,
      StatementBook,
      Book,
    ]),
    AuthModule,
    SettingsModule,
  ],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
