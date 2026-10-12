import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import type { Request, Response } from 'express';
import { appConfig, type AppConfig } from '../app.config.js';
import type { Admin } from '../auth/admin.entity.js';
import {
  AdminAuthGuard,
  CurrentAdmin,
  SuperAdminOnly,
} from '../auth/auth.guard.js';
import { baseUrl } from '../common/base-url.js';
import type { Book } from './book.entity.js';
import { serializeBook } from './book.serializer.js';
import { BooksService } from './books.service.js';
import {
  CreateBookDto,
  ListBooksDto,
  RejectBookDto,
  UpdateBookDto,
} from './dto/book-fields.dto.js';
import { PublishedBooksService } from './published-books.service.js';

// Kept in memory: the archive is inspected before anything touches the disk.
const akukoUpload: MulterOptions = {
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
};
// An update can bring the book's studio file too (see Book.studioFile).
const bookUpload: MulterOptions = {
  limits: { fileSize: 200 * 1024 * 1024, files: 2 },
};

// The studio's API. Every route needs a signed-in admin.
@Controller('api/admin/books')
@UseGuards(AdminAuthGuard)
export class AdminBooksController {
  constructor(
    private readonly books: BooksService,
    private readonly live: PublishedBooksService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  async list(
    @Query() query: ListBooksDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const books = await this.books.findAll(admin, query.status);
    const live = await this.live.findByIds(books.map((b) => b.id));
    const origin = this.origin(request);
    return books.map((book) =>
      serializeBook(book, live.get(book.id) ?? null, origin),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.findOne(id, admin), request);
  }

  @Get(':id/file')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
  ) {
    const book = await this.books.findOne(id, admin);
    const name = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'book';
    return new StreamableFile(await this.books.readFile(book), {
      type: 'application/zip',
      disposition: `attachment; filename="${name}.akuko"`,
    });
  }

  /** The book's studio file, or nothing (204) if it has none. */
  @Get(':id/studio')
  async downloadStudio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Res({ passthrough: true }) response: Response,
  ) {
    const book = await this.books.findOne(id, admin);
    const studio = await this.books.readStudioFile(book);
    if (!studio) {
      response.status(204);
      return;
    }
    return new StreamableFile(studio, {
      type: 'application/zip',
      disposition: 'attachment; filename="book.akukostudio"',
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', akukoUpload))
  async create(
    @Body() dto: CreateBookDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    if (!file) throw new BadRequestException('file (.akuko) is required');
    return this.respond(await this.books.create(dto, file, admin), request);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'studio', maxCount: 1 },
      ],
      bookUpload,
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
    @UploadedFiles()
    files:
      | { file?: Express.Multer.File[]; studio?: Express.Multer.File[] }
      | undefined,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(
      await this.books.update(
        id,
        dto,
        admin,
        files?.file?.[0],
        files?.studio?.[0],
      ),
      request,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentAdmin() admin: Admin) {
    return this.books.remove(id, admin);
  }

  @Post(':id/submit')
  @HttpCode(200)
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.submit(id, admin), request);
  }

  @Post(':id/withdraw')
  @HttpCode(200)
  async withdraw(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.withdraw(id, admin), request);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @SuperAdminOnly()
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.approve(id, admin), request);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @SuperAdminOnly()
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectBookDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.reject(id, admin, dto.note), request);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @SuperAdminOnly()
  async unpublish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    return this.respond(await this.books.unpublish(id, admin), request);
  }

  private async respond(book: Book, request: Request) {
    const live = await this.live.findOptional(book.id);
    return serializeBook(book, live, this.origin(request));
  }

  private origin(request: Request) {
    return baseUrl(request, this.config.publicUrl);
  }
}
