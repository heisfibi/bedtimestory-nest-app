import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// A language code such as "en", "fr" or "zh-Hant".
const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

/** Texts for the studio's Translate buttons: a book's slides and quiz. */
export class TranslateDto {
  @Matches(LANGUAGE_CODE)
  source: string;

  @Matches(LANGUAGE_CODE)
  target: string;

  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  texts: string[];
}
