import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { HelloDto, SessionsDto } from './dto/analytics.dto.js';

// What the mobile app reports. There's no sign-in in the app: a reader is an
// install's made-up id (see Reader).
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Sent when the app starts, once it knows whether there's a subscription. */
  @Post('hello')
  @HttpCode(204)
  async hello(@Body() dto: HelloDto) {
    await this.analytics.hello(dto);
  }

  /** Sittings with books. Ones already sent are skipped, so sending again is safe. */
  @Post('sessions')
  @HttpCode(200)
  async sessions(@Body() dto: SessionsDto) {
    return { accepted: await this.analytics.record(dto) };
  }
}
