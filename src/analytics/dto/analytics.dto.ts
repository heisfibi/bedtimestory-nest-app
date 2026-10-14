import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { READING_MODES, type ReadingMode } from '../reading-session.entity.js';

export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** What the app says of itself when it starts. */
export class HelloDto {
  @IsUUID()
  reader_id: string;

  @IsBoolean()
  subscribed: boolean;

  // The subscription's base plan in Google Play.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  plan?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  purchase_token?: string | null;
}

export class SessionDto {
  @IsUUID()
  id: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  book_id: number;

  @IsDateString()
  started_at: string;

  // A sitting longer than this is a tablet left open, not reading.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6 * 60 * 60)
  seconds: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  pages_read: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  page_count: number;

  @IsBoolean()
  completed: boolean;

  @IsIn(READING_MODES)
  mode: ReadingMode;

  @IsBoolean()
  subscribed: boolean;
}

/** Sittings with books, as many as the app has waiting to send. */
export class SessionsDto {
  @IsUUID()
  reader_id: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SessionDto)
  sessions: SessionDto[];
}

export class CreatorShareDto {
  /** The creator's part of what a book makes, in whole percent. */
  @Type(() => Number)
  @IsInt({ message: 'Give the share as a whole percent' })
  @Min(0)
  @Max(100)
  percent: number;
}

export class MonthQueryDto {
  @IsOptional()
  @Matches(MONTH, { message: 'month must look like 2026-10' })
  month?: string;
}

export class RevenueDto {
  @Matches(MONTH, { message: 'month must look like 2026-10' })
  month: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999_999_999)
  amount: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a code like NGN or USD' })
  currency: string;
}
