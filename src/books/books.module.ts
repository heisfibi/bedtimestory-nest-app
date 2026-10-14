import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, type AppConfig } from '../app.config.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminBooksController } from './admin-books.controller.js';
import { AdminNarratorsController } from './admin-narrators.controller.js';
import { AdminTranslateController } from './admin-translate.controller.js';
import { Book } from './book.entity.js';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { MediaFiles } from './media-files.js';
import { Narrator } from './narrator.entity.js';
import { NarratorsService } from './narrators.service.js';
import { PublishedBook } from './published-book.entity.js';
import { PublishedBooksService } from './published-books.service.js';
import { TranslationService } from './translation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, PublishedBook, Narrator]),
    CatalogModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    BooksController,
    AdminBooksController,
    AdminNarratorsController,
    AdminTranslateController,
  ],
  providers: [
    BooksService,
    NarratorsService,
    PublishedBooksService,
    TranslationService,
    {
      provide: MediaFiles,
      inject: [appConfig.KEY],
      useFactory: ({ mediaRoot }: AppConfig) => new MediaFiles(mediaRoot),
    },
  ],
})
export class BooksModule {}
