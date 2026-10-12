import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
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
import { BackgroundsService } from './backgrounds.service.js';

/** For the app: the backgrounds it should download in place of its own. */
@Controller('api/backgrounds')
export class BackgroundsController {
  constructor(
    private readonly backgrounds: BackgroundsService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.backgrounds.list(baseUrl(request, this.config.publicUrl));
  }
}

// The studio's backgrounds page. Super admins only, reading included.
@Controller('api/admin/backgrounds')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminBackgroundsController {
  constructor(
    private readonly backgrounds: BackgroundsService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.backgrounds.list(baseUrl(request, this.config.publicUrl));
  }

  @Put(':slot')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async replace(
    @Param('slot') slot: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    if (!image) throw new BadRequestException('image is required');
    await this.backgrounds.replace(slot, image.buffer);
    return this.list(request);
  }

  @Delete(':slot')
  @HttpCode(200)
  async reset(@Param('slot') slot: string, @Req() request: Request) {
    await this.backgrounds.reset(slot);
    return this.list(request);
  }
}
