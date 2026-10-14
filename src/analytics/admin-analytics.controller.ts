import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Admin } from '../auth/admin.entity.js';
import {
  AdminAuthGuard,
  CurrentAdmin,
  SuperAdminOnly,
} from '../auth/auth.guard.js';
import { AnalyticsService, monthOf } from './analytics.service.js';
import {
  CreatorShareDto,
  MONTH,
  MonthQueryDto,
  RevenueDto,
} from './dto/analytics.dto.js';

// The studio's analytics. Anyone signed in may look: super admins at
// everything, the others at their own books. Only super admins enter the
// month's money, set the creator share and close months.
@Controller('api/admin/analytics')
@UseGuards(AdminAuthGuard)
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** A month's figures; this month's when none is named. */
  @Get()
  report(@Query() query: MonthQueryDto, @CurrentAdmin() admin: Admin) {
    return this.analytics.report(query.month ?? monthOf(new Date()), admin);
  }

  @Get('months')
  months() {
    return this.analytics.months();
  }

  @Put('revenue')
  @SuperAdminOnly()
  async setRevenue(@Body() dto: RevenueDto, @CurrentAdmin() admin: Admin) {
    await this.analytics.setRevenue(dto);
    return this.analytics.report(dto.month, admin);
  }

  /** The creator's part of what a book makes, for every month not yet closed. */
  @Put('creator-share')
  @SuperAdminOnly()
  async setCreatorShare(
    @Body() dto: CreatorShareDto,
    @CurrentAdmin() admin: Admin,
  ) {
    await this.analytics.setCreatorShare(dto.percent / 100, admin);
    return this.creatorShare();
  }

  /** The creator share now, and who changed it last. */
  @Get('creator-share')
  async creatorShare() {
    const { share, updatedBy, updatedAt } = await this.analytics.creatorShare();
    return {
      creator_share: share,
      updated_by: updatedBy,
      updated_at: updatedAt?.toISOString() ?? null,
    };
  }

  @Post(':month/close')
  @HttpCode(200)
  @SuperAdminOnly()
  async close(@Param('month') month: string, @CurrentAdmin() admin: Admin) {
    await this.analytics.close(this.month(month));
    return this.analytics.report(month, admin);
  }

  @Post(':month/reopen')
  @HttpCode(200)
  @SuperAdminOnly()
  async reopen(@Param('month') month: string, @CurrentAdmin() admin: Admin) {
    await this.analytics.reopen(this.month(month));
    return this.analytics.report(month, admin);
  }

  private month(value: string) {
    if (!MONTH.test(value)) {
      throw new BadRequestException('month must look like 2026-10');
    }
    return value;
  }
}
