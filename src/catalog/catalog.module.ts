import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { Category } from './category.entity.js';
import { Language } from './language.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Language])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
