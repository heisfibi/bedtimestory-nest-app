import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ADMIN_ROLES, type AdminRole } from '../admin.entity.js';

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
