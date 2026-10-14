import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppIntegrityGuard } from '../app-integrity/app-integrity.guard.js';
import type { Request } from 'express';
import { appConfig, type AppConfig } from '../app.config.js';
import { baseUrl } from '../common/base-url.js';
import { serializePublishedBook } from './book.serializer.js';
import {
  ListBooksQueryDto,
  MAX_PAGE_SIZE,
  queryFlag,
} from './dto/list-books-query.dto.js';
import { PublishedBooksService } from './published-books.service.js';

// Read-only endpoints the mobile app calls. Only published books are visible.
@Controller('api')
export class BooksController {
  constructor(
    private readonly published: PublishedBooksService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  // Same envelope as DRF's PageNumberPagination: { count, next, previous, results }.
  @Get('books')
  @UseGuards(AppIntegrityGuard)
  async list(@Query() query: ListBooksQueryDto, @Req() request: Request) {
    const { page, category, type, level, spooky, action } = query;
    const pageSize = Math.min(query.page_size, MAX_PAGE_SIZE);
    const { items, count, freeId } = await this.published.paginate(
      page,
      pageSize,
      { category: category || undefined, type, level, spooky, action },
    );

    const lastPage = Math.max(1, Math.ceil(count / pageSize));
    if (page > lastPage) throw new NotFoundException('Invalid page.');

    const origin = this.origin(request);
    const pageUrl = (target: number) => {
      const params = new URL(request.originalUrl, origin).searchParams;
      params.set('page', String(target));
      return `${origin}${request.path}?${params}`;
    };

    return {
      count,
      next: page < lastPage ? pageUrl(page + 1) : null,
      previous: page > 1 ? pageUrl(page - 1) : null,
      results: items.map((book) =>
        serializePublishedBook(book, origin, freeId),
      ),
    };
  }

  // The website's list. Spooky and action books only with ?spooky=1 and
  // ?action=1, as in /api/books. It's open to anyone, so it leaves out the
  // book files themselves (`url`): those are for the app (AppIntegrityGuard).
  @Get('books-all')
  async listAll(
    @Query('spooky') spooky: string | undefined,
    @Query('action') action: string | undefined,
    @Req() request: Request,
  ) {
    const books = await this.published.findAll({
      spooky: queryFlag({ value: spooky }),
      action: queryFlag({ value: action }),
    });
    const freeId = await this.published.freeBookId();
    return books.map((book) => {
      const { url: _file, ...rest } = serializePublishedBook(
        book,
        this.origin(request),
        freeId,
      );
      return rest;
    });
  }

  @Get('books/:id')
  @UseGuards(AppIntegrityGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return serializePublishedBook(
      await this.published.findOne(id),
      this.origin(request),
      await this.published.freeBookId(),
    );
  }

  private origin(request: Request) {
    return baseUrl(request, this.config.publicUrl);
  }
}
