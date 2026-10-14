import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reader } from '../analytics/reader.entity.js';
import { ReadingSession } from '../analytics/reading-session.entity.js';
import { Admin } from '../auth/admin.entity.js';
import { PublishedBook } from '../books/published-book.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { CreatorFollow, PushDevice, PushNews } from './push-device.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushDevice,
      CreatorFollow,
      PushNews,
      PublishedBook,
      Reader,
      ReadingSession,
      Admin,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
