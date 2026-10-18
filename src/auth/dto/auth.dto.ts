import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ADMIN_ROLES, type AdminRole } from '../admin.entity.js';
import {
  APPLICATION_STATUSES,
  CREATOR_KINDS,
  type ApplicationStatus,
  type CreatorKind,
} from '../creator-application.entity.js';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class NewPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters for the password' })
  @MaxLength(200)
  password: string;
}

export class SetupDto extends NewPasswordDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email: string;
}

export class ChangePasswordDto extends NewPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}

export class CreateAdminDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsIn(ADMIN_ROLES)
  role: AdminRole;
}

export class UpdateAdminDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** From the website's "Become a creator" page. */
export class ApplyDto extends NewPasswordDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tell us your name' })
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(30, {
    message: 'Tell us a little more about yourself (at least 30 characters)',
  })
  @MaxLength(3000)
  about: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(1000)
  links?: string | null;

  @IsArray()
  @ArrayNotEmpty({ message: 'Choose what you would like to make' })
  @ArrayUnique()
  @IsIn(CREATOR_KINDS, { each: true })
  kinds: CreatorKind[];

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(200)
  languages?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80)
  country?: string | null;

  // The version of the Creator Terms the form linked to, which ticking its
  // box agreed to (0 is the built-in text, before any was published).
  @Type(() => Number)
  @IsInt({ message: 'Please agree to the Creator Terms' })
  @Min(0, { message: 'Please agree to the Creator Terms' })
  creator_terms_version: number;

  // Left empty by people; bots fill in every field.
  @IsOptional()
  @IsString()
  website?: string;
}

export class ListApplicationsDto {
  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatus;
}

export class DeclineApplicationDto {
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
