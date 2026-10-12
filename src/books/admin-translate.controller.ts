import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/auth.guard.js';
import { TranslateDto } from './dto/translate.dto.js';
import { TranslationService } from './translation.service.js';

// For the studio's Translate buttons. Any signed-in admin.
@Controller('api/admin/translate')
@UseGuards(AdminAuthGuard)
export class AdminTranslateController {
  constructor(private readonly translation: TranslationService) {}

  /** Whether machine translation is set up, so the studio can say so before it's tried. */
  @Get()
  status() {
    return { available: this.translation.available };
  }

  /** The texts in `target`, in the same order; blank ones stay blank. */
  @Post()
  @HttpCode(200)
  async translate(@Body() { texts, source, target }: TranslateDto) {
    if (!this.translation.available) {
      throw new ServiceUnavailableException(
        "Machine translation isn't set up on this server (LIBRETRANSLATE_URL), so type the translation in yourself.",
      );
    }
    try {
      return {
        texts: await this.translation.translateTexts(texts, source, target),
      };
    } catch (error) {
      throw new BadGatewayException(
        `The translation server couldn't translate into "${target}": ${(error as Error).message}`,
      );
    }
  }
}
