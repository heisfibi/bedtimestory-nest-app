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
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { appConfig, type AppConfig } from '../app.config.js';
import { AdminAuthGuard, SuperAdminOnly } from '../auth/auth.guard.js';
import { baseUrl } from '../common/base-url.js';
import {
  CreateTrackDto,
  RenameTrackDto,
  ReorderTracksDto,
} from './music.dto.js';
import { MusicService } from './music.service.js';

/** For the app: the soundtracks it should download in place of its own. */
@Controller('api/music')
export class MusicController {
  constructor(
    private readonly music: MusicService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.music.list(baseUrl(request, this.config.publicUrl));
  }
}

// The studio's Music page. Super admins only. Every change answers with the
// whole list, in order.
@Controller('api/admin/music')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminMusicController {
  constructor(
    private readonly music: MusicService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.music.list(baseUrl(request, this.config.publicUrl));
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 40 * 1024 * 1024, files: 1 },
    }),
  )
  async add(
    @Body() dto: CreateTrackDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    if (!file) throw new BadRequestException('file is required');
    await this.music.add(dto.name, file.buffer);
    return this.list(request);
  }

  @Put('order')
  async reorder(@Body() dto: ReorderTracksDto, @Req() request: Request) {
    await this.music.reorder(dto.ids);
    return this.list(request);
  }

  @Patch(':id')
  async rename(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameTrackDto,
    @Req() request: Request,
  ) {
    await this.music.rename(id, dto.name);
    return this.list(request);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    await this.music.remove(id);
    return this.list(request);
  }
}
