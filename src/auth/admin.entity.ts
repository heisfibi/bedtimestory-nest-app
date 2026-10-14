import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const ADMIN_ROLES = ['super_admin', 'admin', 'creator'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Everything: the team, the app's backgrounds and music, the money and how it's shared. */
export const isSuperAdmin = (admin: Admin) => admin.role === 'super_admin';
/** Super admins and admins (moderators): they see every book, approve or reject books, and creator applications. */
export const isStaff = (admin: Admin) =>
  admin.role === 'super_admin' || admin.role === 'admin';

// People who can sign in to the studio at /create. Creators write books and
// submit them for review. Admins are moderators: they also review every
// book and the applications to become a creator. Super admins also manage
// the team, the app's backgrounds and music, and the money.
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  // Stored lowercased.
  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'creator' })
  role: AdminRole;

  // Deactivated admins can't sign in. Accounts are never deleted so books
  // keep their author.
  @Column({ default: true })
  active: boolean;

  // Goes up on every password change or reset. Session tokens carry the
  // version they were issued at, so older sessions stop working.
  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion: number;

  // Typed in the app, opens this account's books there without a
  // subscription (see UnlockCodesService). Made the first time they look at
  // it; a new one replaces it. Stored without its dash: "K7MPQ2XA".
  @Column({
    name: 'unlock_code',
    type: 'varchar',
    length: 16,
    nullable: true,
    unique: true,
  })
  unlockCode: string | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export function serializeAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    active: admin.active,
    last_login_at: admin.lastLoginAt?.toISOString() ?? null,
    created_at: admin.createdAt.toISOString(),
  };
}
