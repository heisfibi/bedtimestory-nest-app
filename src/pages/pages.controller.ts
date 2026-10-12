import { join } from 'node:path';
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

// The app links to `${baseUrl}/terms` and `${baseUrl}/privacy` from the
// subscriptions screen.
const VIEWS_DIR = join(process.cwd(), 'views');

@Controller()
export class PagesController {
  @Get()
  status() {
    return { name: 'storytime-api', status: 'ok' };
  }

  @Get('terms')
  terms(@Res() response: Response) {
    response.sendFile(join(VIEWS_DIR, 'terms.html'));
  }

  @Get('privacy')
  privacy(@Res() response: Response) {
    response.sendFile(join(VIEWS_DIR, 'privacy.html'));
  }
}
