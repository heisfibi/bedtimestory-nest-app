import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { appConfig, type AppConfig } from '../app.config.js';
import { Admin } from '../auth/admin.entity.js';
import { PublishedBook } from '../books/published-book.entity.js';

// No 0/O, 1/I/L: a code is read off a screen or a poster and typed on a tablet.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

/** As typed: spaces, dashes and letter case don't matter. */
export const normalizeCode = (code: string) =>
  code.replace(/[^0-9a-z]/gi, '').toUpperCase();

/** "K7MPQ2XA" → "K7MP-Q2XA". */
export const formatCode = (code: string) =>
  `${code.slice(0, LENGTH / 2)}-${code.slice(LENGTH / 2)}`;

const digest = (code: string) =>
  createHash('sha256').update(normalizeCode(code)).digest();

/** What a code typed in the app opens. */
export type Unlocked =
  | { all: true; creator: null }
  | { all: false; creator: { id: number; name: string } };

/**
 * Codes typed in the app that open books without a subscription: a
 * creator's own code opens their books, so they can give their readers
 * their work; the reviewer code (REVIEWER_CODE, for Google Play's
 * reviewers) opens every book. Reading opened this way counts as reading
 * without a subscription, and earns nothing.
 */
@Injectable()
export class UnlockCodesService {
  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(PublishedBook)
    private readonly published: Repository<PublishedBook>,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  /** What `code` opens, or null if nothing: an unknown code, or a deactivated account's. */
  async redeem(code: string): Promise<Unlocked | null> {
    const { reviewerCode } = this.config;
    if (reviewerCode && timingSafeEqual(digest(code), digest(reviewerCode))) {
      return { all: true, creator: null };
    }
    const normalized = normalizeCode(code);
    if (normalized.length !== LENGTH) return null;
    const owner = await this.admins.findOneBy({ unlockCode: normalized });
    if (!owner?.active) return null;
    return { all: false, creator: { id: owner.id, name: owner.name } };
  }

  /** The account's code, made now if it has none; and how many of its books are in the app. */
  async own(admin: Admin) {
    if (!admin.unlockCode) await this.renew(admin);
    return this.describe(admin);
  }

  /** A new code for the account. The old one stops working, in apps that took it too. */
  async renew(admin: Admin) {
    for (;;) {
      const code = Array.from(
        { length: LENGTH },
        () => ALPHABET[randomInt(ALPHABET.length)],
      ).join('');
      if (await this.admins.existsBy({ unlockCode: code })) continue;
      admin.unlockCode = code;
      await this.admins.update(admin.id, { unlockCode: code });
      return this.describe(admin);
    }
  }

  private async describe(admin: Admin) {
    return {
      code: formatCode(admin.unlockCode!),
      live_books: await this.published.countBy({ creator: { id: admin.id } }),
    };
  }
}
