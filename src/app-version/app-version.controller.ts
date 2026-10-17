import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';
import type { Admin } from '../auth/admin.entity.js';
import {
  AdminAuthGuard,
  CurrentAdmin,
  SuperAdminOnly,
} from '../auth/auth.guard.js';
import { SettingsService } from '../settings/settings.service.js';
import { compareVersions, VERSION } from './versions.js';

// A blank box in the studio means no version.
const blankIsNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class AppVersionsDto {
  @IsOptional()
  @Transform(blankIsNull)
  @IsString()
  @Matches(VERSION, { message: 'min_version must look like 1.4.0' })
  min_version?: string | null;

  @IsOptional()
  @Transform(blankIsNull)
  @IsString()
  @Matches(VERSION, { message: 'latest_version must look like 1.4.0' })
  latest_version?: string | null;
}

/**
 * Tells the app which versions of it are still fine. An app older than
 * `min_version` must be updated before it can be used; one older than
 * `latest_version` is offered the update. Open to every app, however old,
 * so it isn't behind the app check (AppIntegrityGuard).
 */
@Controller('api/app-version')
export class AppVersionController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async versions() {
    const { versions } = await this.settings.appVersionsSetting();
    return { min_version: versions.min, latest_version: versions.latest };
  }
}

// The studio: super admins set the versions.
@Controller('api/admin/app-version')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminAppVersionController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async versions() {
    return this.answer(await this.settings.appVersionsSetting());
  }

  @Put()
  async setVersions(@Body() dto: AppVersionsDto, @CurrentAdmin() admin: Admin) {
    const min = dto.min_version ?? null;
    const latest = dto.latest_version ?? null;
    if (min && latest && compareVersions(latest, min) < 0) {
      throw new BadRequestException(
        'The latest version can’t be older than the minimum version',
      );
    }
    return this.answer(
      await this.settings.setAppVersions({ min, latest }, admin.name),
    );
  }

  private answer({
    versions,
    updatedBy,
    updatedAt,
  }: Awaited<ReturnType<SettingsService['appVersionsSetting']>>) {
    return {
      min_version: versions.min,
      latest_version: versions.latest,
      updated_by: updatedBy,
      updated_at: updatedAt?.toISOString() ?? null,
    };
  }
}
