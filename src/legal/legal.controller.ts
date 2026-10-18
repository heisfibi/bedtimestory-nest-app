import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { Admin } from '../auth/admin.entity.js';
import {
  AdminAuthGuard,
  CurrentAdmin,
  SuperAdminOnly,
} from '../auth/auth.guard.js';
import { isLegalDocument, type LegalDocument } from './legal-documents.js';
import { legalPageHtml } from './legal-page.js';
import { LegalService, sectionsOf } from './legal.service.js';

const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class LegalPreviewDto {
  @IsString()
  @MaxLength(100_000)
  body: string;
}

export class SaveLegalDto extends LegalPreviewDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Give the effective date as a day, like 2026-10-18.',
  })
  @IsDateString(
    { strict: true },
    { message: 'That effective date isn’t a real day.' },
  )
  effective_date: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(300, { message: 'Keep “What changed” under 300 characters.' })
  note?: string | null;
}

function documentOf(value: string): LegalDocument {
  if (!isLegalDocument(value)) {
    throw new NotFoundException('There is no such page.');
  }
  return value;
}

/** The pages themselves, as the app and the Play Console link to them. */
@Controller()
export class LegalPagesController {
  constructor(private readonly legal: LegalService) {}

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60')
  privacy() {
    return this.html('privacy');
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60')
  terms() {
    return this.html('terms');
  }

  @Get('creator-terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60')
  creatorTerms() {
    return this.html('creator-terms');
  }

  private async html(document: LegalDocument) {
    const page = await this.legal.page(document);
    return legalPageHtml({
      document,
      title: page.title,
      summary: page.summary,
      effectiveDateText: page.effective_date_text,
      sections: page.sections,
    });
  }
}

/** The same pages for the website, which lays them out itself. */
@Controller('api/legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get(':document')
  @Header('Cache-Control', 'public, max-age=60')
  page(@Param('document') document: string) {
    return this.legal.page(documentOf(document));
  }
}

// The studio's Legal page: super admins publish new versions.
@Controller('api/admin/legal')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminLegalController {
  constructor(private readonly legal: LegalService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return this.legal.list();
  }

  /** How a text will look, without publishing it (and what's wrong with it, if anything). */
  @Post('preview')
  @HttpCode(200)
  preview(@Body() dto: LegalPreviewDto) {
    return { sections: sectionsOf(dto.body) };
  }

  @Get(':document')
  @Header('Cache-Control', 'no-store')
  view(@Param('document') document: string) {
    return this.legal.adminView(documentOf(document));
  }

  @Get(':document/versions/:version')
  @Header('Cache-Control', 'no-store')
  version(
    @Param('document') document: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.legal.version(documentOf(document), version);
  }

  @Put(':document')
  save(
    @Param('document') document: string,
    @Body() dto: SaveLegalDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.legal.save(
      documentOf(document),
      { body: dto.body, effectiveDate: dto.effective_date, note: dto.note },
      admin.name,
    );
  }
}
