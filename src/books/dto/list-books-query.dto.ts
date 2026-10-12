import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BOOK_TYPES, MAX_LEVEL, type BookType } from '../book.entity.js';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** "1" or "true" (query strings) count as yes; anything else as no. */
export const queryFlag = ({ value }: { value: unknown }) =>
  value === true || value === '1' || value === 'true';

export class ListBooksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Values above MAX_PAGE_SIZE are clamped, as DRF's PageNumberPagination did.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size: number = DEFAULT_PAGE_SIZE;

  // Category name. The app sends an empty string for "All".
  @IsOptional()
  @IsString()
  category?: string;

  // "basic" (stories), "poem" or "comic". Leave out for every type.
  @IsOptional()
  @IsIn(BOOK_TYPES)
  type?: BookType;

  // A reading level, 1 to MAX_LEVEL. Leave out for every level.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LEVEL)
  level?: number;

  // Spooky and action books are left out unless the app asks for them (a
  // parent has turned that kind on), so older app versions never list them.
  @IsOptional()
  @Transform(queryFlag)
  @IsBoolean()
  spooky: boolean = false;

  @IsOptional()
  @Transform(queryFlag)
  @IsBoolean()
  action: boolean = false;
}
