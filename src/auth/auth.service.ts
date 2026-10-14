import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service.js';
import { Admin } from './admin.entity.js';
import { ApplicationsService } from './applications.service.js';
import { CreateAdminDto, SetupDto, UpdateAdminDto } from './dto/auth.dto.js';
import {
  hashPassword,
  temporaryPassword,
  verifyAgainstDummy,
  verifyPassword,
} from './passwords.js';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    private readonly jwt: JwtService,
    private readonly applications: ApplicationsService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit() {
    // Until 2026-10-13 there were two roles, and "admin" wrote books and
    // submitted them: what a creator does now. Admins have since become
    // moderators, so the accounts made before then become creators.
    await this.settings.once('roles-with-creators', async () => {
      await this.admins.update({ role: 'admin' }, { role: 'creator' });
    });
  }

  // --- Sessions ---

  async login(email: string, password: string) {
    const admin = await this.admins.findOneBy({ email });
    const valid = admin
      ? await verifyPassword(password, admin.passwordHash)
      : await verifyAgainstDummy(password);
    if (!admin) {
      // Someone who applied to be a creator and isn't one (yet).
      const refusal = await this.applications.signInRefusal(email, password);
      if (refusal) throw new ForbiddenException(refusal);
    }
    if (!admin || !valid)
      throw new UnauthorizedException('Wrong email or password');
    if (!admin.active) {
      throw new ForbiddenException('This account has been deactivated');
    }
    admin.lastLoginAt = new Date();
    await this.admins.save(admin);
    return this.session(admin);
  }

  async setupNeeded() {
    return (await this.admins.count()) === 0;
  }

  /** Creates the first super admin. Only works while there are no admins. */
  async setup(dto: SetupDto) {
    if (!(await this.setupNeeded())) {
      throw new ForbiddenException(
        'The studio is already set up. Sign in instead.',
      );
    }
    const admin = await this.admins.save(
      this.admins.create({
        name: dto.name,
        email: dto.email,
        role: 'super_admin',
        passwordHash: await hashPassword(dto.password),
        lastLoginAt: new Date(),
      }),
    );
    return this.session(admin);
  }

  async changePassword(
    admin: Admin,
    currentPassword: string,
    password: string,
  ) {
    if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw new BadRequestException('Your current password is wrong');
    }
    admin.passwordHash = await hashPassword(password);
    admin.sessionVersion++;
    await this.admins.save(admin);
    // Other sessions are now invalid; this one gets a fresh token.
    return this.session(admin);
  }

  private async session(admin: Admin) {
    return {
      token: await this.jwt.signAsync({
        sub: admin.id,
        v: admin.sessionVersion,
      }),
      admin,
    };
  }

  // --- Team management (super admins) ---

  listAdmins() {
    return this.admins.find({ order: { createdAt: 'ASC', id: 'ASC' } });
  }

  async createAdmin(dto: CreateAdminDto) {
    if (await this.admins.existsBy({ email: dto.email })) {
      throw new ConflictException(`${dto.email} already has an account`);
    }
    const password = temporaryPassword();
    const admin = await this.admins.save(
      this.admins.create({
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: await hashPassword(password),
      }),
    );
    return { admin, temporaryPassword: password };
  }

  async updateAdmin(id: number, dto: UpdateAdminDto, actor: Admin) {
    const admin = await this.findAdmin(id);
    if (admin.id === actor.id && dto.active === false) {
      throw new BadRequestException("You can't deactivate your own account");
    }
    const losesSuperAdmin =
      admin.role === 'super_admin' &&
      admin.active &&
      ((dto.role && dto.role !== 'super_admin') || dto.active === false);
    if (losesSuperAdmin && (await this.activeSuperAdmins()) <= 1) {
      throw new BadRequestException(
        'There must always be at least one active super admin',
      );
    }
    Object.assign(admin, dto);
    return this.admins.save(admin);
  }

  /** Sets a new one-time password and signs the admin out everywhere. */
  async resetPassword(id: number) {
    const admin = await this.findAdmin(id);
    const password = temporaryPassword();
    admin.passwordHash = await hashPassword(password);
    admin.sessionVersion++;
    await this.admins.save(admin);
    return { admin, temporaryPassword: password };
  }

  private async findAdmin(id: number) {
    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException(`Admin ${id} not found`);
    return admin;
  }

  private activeSuperAdmins() {
    return this.admins.countBy({ role: 'super_admin', active: true });
  }
}
