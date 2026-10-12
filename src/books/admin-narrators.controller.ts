import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/auth.guard.js';
import { NarratorsService } from './narrators.service.js';

// For the studio's narrator picker. Any signed-in admin.
@Controller('api/admin/narrators')
@UseGuards(AdminAuthGuard)
export class AdminNarratorsController {
  constructor(private readonly narrators: NarratorsService) {}

  /** Names of everyone who has narrated a voice-over, alphabetically. */
  @Get()
  list() {
    return this.narrators.list();
  }
}
