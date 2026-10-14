import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** An install saying where to send it notifications, and which. */
export class DeviceDto {
  @IsUUID()
  reader_id: string;

  // Expo push token. Null when notifications are off (or not allowed): the
  // install then hears of nothing.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  token?: string | null;

  @IsString()
  @MaxLength(8)
  language: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  time_zone?: string | null;

  // Minutes ahead of UTC.
  @Type(() => Number)
  @IsInt()
  @Min(-14 * 60)
  @Max(14 * 60)
  utc_offset: number;

  @IsBoolean()
  new_books: boolean;

  @IsBoolean()
  creators: boolean;

  @IsBoolean()
  spooky: boolean;

  @IsBoolean()
  action: boolean;
}

/** Every creator an install follows (the app's list replaces the one here). */
export class FollowsDto {
  @IsUUID()
  reader_id: string;

  @IsArray()
  @ArrayMaxSize(500)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  creator_ids: number[];
}
