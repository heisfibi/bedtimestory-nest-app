import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Admin, serializeAdmin } from './admin.entity.js';
import { AdminAuthGuard, CurrentAdmin, SuperAdminOnly } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  ChangePasswordDto,
  CreateAdminDto,
  LoginDto,
  SetupDto,
  UpdateAdminDto,
} from './dto/auth.dto.js';

const session = ({ token, admin }: { token: string; admin: Admin }) => ({
  token,
  admin: serializeAdmin(admin),
});

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async login(@Body() dto: LoginDto) {
    return session(await this.auth.login(dto.email, dto.password));
  }

  @Get('setup')
  async setupStatus() {
    return { needed: await this.auth.setupNeeded() };
  }

  @Post('setup')
  @UseGuards(ThrottlerGuard)
  async setup(@Body() dto: SetupDto) {
    return session(await this.auth.setup(dto));
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@CurrentAdmin() admin: Admin) {
    return serializeAdmin(admin);
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard)
  async changePassword(
    @CurrentAdmin() admin: Admin,
    @Body() dto: ChangePasswordDto,
  ) {
    return session(
      await this.auth.changePassword(admin, dto.currentPassword, dto.password),
    );
  }
}

@Controller('api/admin/admins')
@UseGuards(AdminAuthGuard)
@SuperAdminOnly()
export class AdminsController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  async list() {
    return (await this.auth.listAdmins()).map(serializeAdmin);
  }

  /** Returns a one-time password to hand to the new admin. */
  @Post()
  async create(@Body() dto: CreateAdminDto) {
    const { admin, temporaryPassword } = await this.auth.createAdmin(dto);
    return {
      admin: serializeAdmin(admin),
      temporary_password: temporaryPassword,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() actor: Admin,
  ) {
    return serializeAdmin(await this.auth.updateAdmin(id, dto, actor));
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    const { admin, temporaryPassword } = await this.auth.resetPassword(id);
    return {
      admin: serializeAdmin(admin),
      temporary_password: temporaryPassword,
    };
  }
}
