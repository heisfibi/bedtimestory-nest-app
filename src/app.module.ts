import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { appConfig, type AppConfig } from './app.config.js';
import { BackgroundsModule } from './backgrounds/backgrounds.module.js';
import { BooksModule } from './books/books.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { MusicModule } from './music/music.module.js';
import { PagesController } from './pages/pages.controller.js';
import { ReviewerController } from './reviewer/reviewer.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: ({ database }: AppConfig) => ({
        ...(database.type === 'sqlite'
          ? { type: 'better-sqlite3' as const, database: database.name }
          : {
              type: 'mysql' as const,
              host: database.host,
              port: database.port,
              username: database.username,
              password: database.password,
              database: database.name,
              charset: 'utf8mb4_unicode_ci',
            }),
        autoLoadEntities: true,
        // Fine while the schema is young; switch to migrations before the
        // data becomes precious.
        synchronize: true,
      }),
    }),
    CatalogModule,
    BooksModule,
    AnalyticsModule,
    BackgroundsModule,
    MusicModule,
  ],
  controllers: [PagesController, ReviewerController],
})
export class AppModule {}
