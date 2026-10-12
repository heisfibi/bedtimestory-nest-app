import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BOOK_MOODS,
  BOOK_STATUSES,
  BOOK_TYPES,
  MAX_LEVEL,
  type BookMood,
  type BookStatus,
  type BookType,
} from '../book.entity.js';

// Sent as multipart/form-data alongside the `file` (.akuko) upload.
export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  author?: string;

  // ISO code from /api/languages.
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsIn(BOOK_TYPES)
  type?: BookType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LEVEL)
  level?: number;

  @IsOptional()
  @IsIn(BOOK_MOODS)
  mood?: BookMood;

  // Category name from /api/categories. An empty string clears it.
  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateBookDto extends PartialType(CreateBookDto) {}

export class ListBooksDto {
  @IsOptional()
  @IsIn(BOOK_STATUSES)
  status?: BookStatus;
}

export class RejectBookDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Tell the author what to change' })
  @MaxLength(2000)
  note: string;
}
