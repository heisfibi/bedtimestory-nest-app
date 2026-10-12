import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('api')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('languages')
  async listLanguages() {
    const languages = await this.catalog.listLanguages();
    return languages.map(({ id, name, isoCode }) => ({
      id,
      name,
      iso_code: isoCode,
    }));
  }
}
