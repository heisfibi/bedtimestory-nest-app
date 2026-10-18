import { Controller, Get } from '@nestjs/common';

// The privacy policy and terms the app links to (`${baseUrl}/privacy`,
// `${baseUrl}/terms`) are served by the legal module.
@Controller()
export class PagesController {
  @Get()
  status() {
    return { name: 'storytime-api', status: 'ok' };
  }
}
