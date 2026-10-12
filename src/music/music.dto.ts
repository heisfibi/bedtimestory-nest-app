import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Sent as multipart/form-data alongside the `file` upload.
export class CreateTrackDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class RenameTrackDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class ReorderTracksDto {
  /** Every track's id, in the new order. */
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  ids: number[];
}
