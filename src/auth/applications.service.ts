import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './admin.entity.js';
import {
  CreatorApplication,
  type ApplicationStatus,
} from './creator-application.entity.js';
import type { ApplyDto } from './dto/auth.dto.js';
import { hashPassword, verifyPassword } from './passwords.js';

/**
 * Applications to become a creator: made on the website, decided by admins
 * and super admins. Approving one makes a creator account with the password
 * the applicant chose, so there's nothing to send them.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(CreatorApplication)
    private readonly applications: Repository<CreatorApplication>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
  ) {}

  async apply(dto: ApplyDto) {
    if (await this.admins.existsBy({ email: dto.email })) {
      throw new ConflictException(
        'This email already has a studio account. Sign in instead.',
      );
    }
    if (
      await this.applications.existsBy({ email: dto.email, status: 'pending' })
    ) {
      throw new ConflictException(
        "You've already applied with this email. We'll look at it soon.",
      );
    }
    return this.applications.save(
      this.applications.create({
        name: dto.name,
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        about: dto.about,
        links: dto.links ?? null,
        kinds: dto.kinds,
        languages: dto.languages ?? null,
        country: dto.country ?? null,
        creatorTermsVersion: dto.creator_terms_version,
        status: 'pending',
      }),
    );
  }

  /** Oldest first while waiting; newest decisions first otherwise. */
  list(status?: ApplicationStatus) {
    return this.applications.find({
      where: status ? { status } : {},
      order:
        status === 'pending'
          ? { createdAt: 'ASC', id: 'ASC' }
          : { createdAt: 'DESC', id: 'DESC' },
    });
  }

  /** Makes the applicant a creator, signing in with the password they chose. */
  async approve(id: number, reviewer: Admin) {
    const application = await this.pending(id);
    if (await this.admins.existsBy({ email: application.email })) {
      throw new ConflictException(
        `${application.email} already has an account. Decline this application instead.`,
      );
    }
    const account = await this.admins.save(
      this.admins.create({
        name: application.name,
        email: application.email,
        role: 'creator',
        passwordHash: application.passwordHash,
      }),
    );
    application.status = 'approved';
    application.accountId = account.id;
    application.passwordHash = '';
    application.reviewNote = null;
    return this.decided(application, reviewer);
  }

  async decline(id: number, reviewer: Admin, note: string | null) {
    const application = await this.pending(id);
    application.status = 'declined';
    application.reviewNote = note;
    return this.decided(application, reviewer);
  }

  /**
   * Why someone without an account can't sign in, if they applied and gave
   * the password they applied with; null otherwise.
   */
  async signInRefusal(email: string, password: string) {
    const latest = await this.applications.findOne({
      where: { email },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    if (
      !latest ||
      latest.status === 'approved' ||
      !(await verifyPassword(password, latest.passwordHash))
    ) {
      return null;
    }
    if (latest.status === 'pending') {
      return "Thanks for applying! Your application is still being reviewed. You'll be able to sign in once it's approved.";
    }
    return `Your application to become a creator wasn't accepted.${
      latest.reviewNote ? ` ${latest.reviewNote}` : ''
    }`;
  }

  private async pending(id: number) {
    const application = await this.applications.findOneBy({ id });
    if (!application)
      throw new NotFoundException(`Application ${id} not found`);
    if (application.status !== 'pending') {
      throw new ConflictException(
        `This application was already ${application.status}`,
      );
    }
    return application;
  }

  private decided(application: CreatorApplication, reviewer: Admin) {
    application.reviewedBy = reviewer;
    application.reviewedAt = new Date();
    return this.applications.save(application);
  }
}
