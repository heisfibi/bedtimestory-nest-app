import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SettingsService } from '../settings/settings.service.js';
import type { Admin } from './admin.entity.js';
import { ApplicationsService } from './applications.service.js';
import { AdminAuthGuard, CurrentAdmin, StaffOnly } from './auth.guard.js';
import { serializeApplication } from './creator-application.entity.js';
import {
  ApplyDto,
  DeclineApplicationDto,
  ListApplicationsDto,
} from './dto/auth.dto.js';

// The website's "Become a creator" page.
@Controller('api/creator-applications')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly settings: SettingsService,
  ) {}

  /** What the page tells would-be creators: their part of what their books make. */
  @Get('terms')
  async terms() {
    return { creator_share: await this.settings.creatorShare() };
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  async apply(@Body() dto: ApplyDto) {
    // A bot filled in the hidden field: say thanks and keep nothing.
    if (dto.website) return { status: 'pending' };
    const application = await this.applications.apply(dto);
    return { status: application.status };
  }
}

// The studio's Applications page: admins and super admins decide.
@Controller('api/admin/creator-applications')
@UseGuards(AdminAuthGuard)
@StaffOnly()
export class AdminApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  async list(@Query() query: ListApplicationsDto) {
    return (await this.applications.list(query.status)).map(
      serializeApplication,
    );
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() reviewer: Admin,
  ) {
    return serializeApplication(await this.applications.approve(id, reviewer));
  }

  @Post(':id/decline')
  @HttpCode(200)
  async decline(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeclineApplicationDto,
    @CurrentAdmin() reviewer: Admin,
  ) {
    return serializeApplication(
      await this.applications.decline(id, reviewer, dto.note ?? null),
    );
  }
}
