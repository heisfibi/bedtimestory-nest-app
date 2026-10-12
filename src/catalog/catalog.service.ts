import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity.js';
import { Language } from './language.entity.js';
import { CATEGORY_SEED, LANGUAGE_SEED } from './seed-data.js';

@Injectable()
export class CatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Language)
    private readonly languages: Repository<Language>,
  ) {}

  // Adds seed entries the database doesn't have yet, so a new language or
  // category in seed-data.ts reaches existing installs too. (Copies, because
  // save() writes the new ids back into the objects it is given.)
  async onApplicationBootstrap() {
    const categoryNames = new Set(
      (await this.categories.find()).map((c) => c.name),
    );
    const newCategories = CATEGORY_SEED.filter(
      (c) => !categoryNames.has(c.name),
    );
    if (newCategories.length) {
      await this.categories.save(newCategories.map((c) => ({ ...c })));
      this.logger.log(
        `Added categories: ${newCategories.map((c) => c.name).join(', ')}`,
      );
    }

    const languageCodes = new Set(
      (await this.languages.find()).map((l) => l.isoCode),
    );
    const newLanguages = LANGUAGE_SEED.filter(
      (l) => !languageCodes.has(l.isoCode),
    );
    if (newLanguages.length) {
      await this.languages.save(newLanguages.map((l) => ({ ...l })));
      this.logger.log(
        `Added languages: ${newLanguages.map((l) => l.name).join(', ')}`,
      );
    }
  }

  listCategories() {
    return this.categories.find({ order: { id: 'ASC' } });
  }

  listLanguages() {
    return this.languages.find({ order: { id: 'ASC' } });
  }

  findCategoryByName(name: string) {
    return this.categories.findOneBy({ name });
  }
}
