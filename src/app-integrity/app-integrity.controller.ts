import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { AppIntegrityService } from './app-integrity.service.js';

export class VerifyDto {
  @IsString()
  @MaxLength(500)
  challenge: string;

  // What Google Play gave the app for the challenge.
  @IsString()
  @MaxLength(20_000)
  integrity_token: string;

  @IsUUID()
  reader_id: string;
}

// The app proving it's our own (see AppIntegrityService). Open to everyone:
// this is how an app gets its app token.
@Controller('api/app-integrity')
export class AppIntegrityController {
  constructor(private readonly integrity: AppIntegrityService) {}

  /** A challenge for Google Play to judge; and whether checks are on at all. */
  @Get('challenge')
  challenge() {
    return {
      required: this.integrity.required,
      challenge: this.integrity.challenge(),
      cloud_project_number: this.integrity.cloudProjectNumber,
    };
  }

  /** Play's verdict on the challenge: an app token if it's our app. */
  @Post('verify')
  @HttpCode(200)
  // Each one is a call to Google, whose quota is daily: a phone needs one a
  // day or so, and households share an address.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  verify(@Body() dto: VerifyDto) {
    return this.integrity.verify(
      dto.challenge,
      dto.integrity_token,
      dto.reader_id,
    );
  }
}
