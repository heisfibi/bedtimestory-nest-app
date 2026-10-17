import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';
import { AppIntegrityGuard } from '../app-integrity/app-integrity.guard.js';
import type { Admin } from '../auth/admin.entity.js';
import { AdminAuthGuard, CurrentAdmin } from '../auth/auth.guard.js';
import { UnlockCodesService } from './unlock-codes.service.js';

export class RedeemCodeDto {
  @IsString()
  @MaxLength(200)
  code: string;
}

/**
 * For the app's code box ("Restore purchases" held). Answers what the code opens: every book
 * (`all`), or one creator's. The app asks again about the codes it keeps, so
 * a renewed code or a deactivated account closes the books again.
 */
@Controller('api/unlock-codes')
@UseGuards(AppIntegrityGuard)
export class UnlockCodesController {
  constructor(private readonly codes: UnlockCodesService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async redeem(@Body() dto: RedeemCodeDto) {
    const unlocked = await this.codes.redeem(dto.code);
    if (!unlocked) throw new ForbiddenException('That code is not valid.');
    return unlocked;
  }
}

// The studio: anyone signed in has a code for their own books.
@Controller('api/admin/unlock-code')
@UseGuards(AdminAuthGuard)
export class AdminUnlockCodeController {
  constructor(private readonly codes: UnlockCodesService) {}

  @Get()
  own(@CurrentAdmin() admin: Admin) {
    return this.codes.own(admin);
  }

  @Post('renew')
  @HttpCode(200)
  renew(@CurrentAdmin() admin: Admin) {
    return this.codes.renew(admin);
  }
}
