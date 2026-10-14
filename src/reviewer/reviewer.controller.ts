import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppIntegrityGuard } from '../app-integrity/app-integrity.guard.js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';
import { appConfig, type AppConfig } from '../app.config.js';

export class ReviewerAccessDto {
  @IsString()
  @MaxLength(200)
  code: string;
}

// Typed on a tablet: spaces and letter case don't matter.
const digest = (code: string) =>
  createHash('sha256').update(code.replace(/\s+/g, '').toUpperCase()).digest();

// Google Play's reviewers must see every book without paying. The app's
// subscriptions screen takes a code (REVIEWER_CODE) that opens them all; what
// they read isn't counted as a subscriber's. Unset, no code works.
@Controller('api/reviewer-access')
@UseGuards(AppIntegrityGuard)
export class ReviewerController {
  constructor(@Inject(appConfig.KEY) private readonly config: AppConfig) {}

  @Post()
  @HttpCode(204)
  @UseGuards(ThrottlerGuard)
  check(@Body() dto: ReviewerAccessDto) {
    const { reviewerCode } = this.config;
    if (
      !reviewerCode ||
      !timingSafeEqual(digest(dto.code), digest(reviewerCode))
    ) {
      throw new ForbiddenException('That code is not valid.');
    }
  }
}
