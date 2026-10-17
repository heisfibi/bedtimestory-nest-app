import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { appConfig, type AppConfig } from '../app.config.js';
import type { Admin } from '../auth/admin.entity.js';
import {
  AdminAuthGuard,
  CurrentAdmin,
  SuperAdminOnly,
} from '../auth/auth.guard.js';
import { baseUrl } from '../common/base-url.js';
import { AppReleaseService } from './app-release.service.js';
import {
  isStorePlatform,
  MAX_BUILD,
  MAX_NOTES,
  RELEASE_VERSION,
  type StorePlatform,
} from './release.js';

// A blank box in the studio means "not set".
const blankIsNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** One store's entry, in the manifest's own shape (see release.ts). */
export class SaveAppReleaseDto {
  @IsString()
  @Matches(RELEASE_VERSION, {
    message: 'The version should look like 1.2.0 (numbers and dots only).',
  })
  version: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'The build number has to be a whole number.' })
  @Min(1, { message: 'The build number has to be 1 or more.' })
  @Max(MAX_BUILD)
  build?: number | null;

  @IsOptional()
  @Transform(blankIsNull)
  @IsString()
  @Matches(RELEASE_VERSION, {
    message:
      'The minimum version should look like 1.0.0 (numbers and dots only).',
  })
  minimumVersion?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'The minimum build has to be a whole number.' })
  @Min(1, { message: 'The minimum build has to be 1 or more.' })
  @Max(MAX_BUILD)
  minimumBuild?: number | null;

  @IsString()
  @MaxLength(500)
  storeUrl: string;

  @IsArray()
  @ArrayMaxSize(MAX_NOTES, {
    message: `The update card shows at most ${MAX_NOTES} "what's new" lines.`,
  })
  @IsString({ each: true })
  @MaxLength(200, {
    each: true,
    message: 'Keep each "what\'s new" line under 200 characters.',
  })
  notes: string[];
}

const MANIFEST_PATH = '/api/app-release/manifest.json';

/**
 * What each store is serving, for the app's update card and "Time to update"
 * screen (bedtime-story/appUpdate.ts). Open to every app, however old, so
 * it's outside the app check (AppIntegrityGuard): an app too old to pass it
 * is exactly the one that most needs to be told.
 */
@Controller('api/app-release')
export class AppReleaseController {
  constructor(private readonly releases: AppReleaseService) {}

  @Get('manifest.json')
  // A cached copy would keep announcing a release long after the next one.
  @Header('Cache-Control', 'no-cache, must-revalidate')
  manifest() {
    return this.releases.manifest();
  }
}

// The studio's App release page: super admins set what each store is serving.
@Controller('api/admin/app-release')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminAppReleaseController {
  constructor(
    private readonly releases: AppReleaseService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async view(@Req() request: Request) {
    return {
      ...(await this.releases.adminView()),
      manifest_url: `${baseUrl(request, this.config.publicUrl)}${MANIFEST_PATH}`,
    };
  }

  @Put(':platform')
  async save(
    @Param('platform') platform: string,
    @Body() dto: SaveAppReleaseDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    await this.releases.save(this.store(platform), dto, admin.name);
    return this.view(request);
  }

  @Delete(':platform')
  @HttpCode(200)
  async remove(@Param('platform') platform: string, @Req() request: Request) {
    await this.releases.remove(this.store(platform));
    return this.view(request);
  }

  private store(platform: string): StorePlatform {
    if (!isStorePlatform(platform)) {
      throw new BadRequestException('The store must be android or ios.');
    }
    return platform;
  }
}
