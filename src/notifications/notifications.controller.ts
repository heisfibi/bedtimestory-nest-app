import {
  Body,
  Controller,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AppIntegrityGuard } from '../app-integrity/app-integrity.guard.js';
import { DeviceDto, FollowsDto } from './dto/notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

// What the mobile app says about notifications. As with analytics there's no
// sign-in: a reader is an install's made-up id.
@Controller('api/notifications')
@UseGuards(AppIntegrityGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Sent when the app starts and whenever its notification settings change. */
  @Post('device')
  @HttpCode(204)
  async device(@Body() dto: DeviceDto) {
    await this.notifications.register(dto);
  }

  /** The creators the install follows, all of them (it replaces the list). */
  @Put('follows')
  follows(@Body() dto: FollowsDto) {
    return this.notifications.setFollows(dto);
  }
}
