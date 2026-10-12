import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const ADMIN_ROLES = ['super_admin', 'admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// People who can sign in to the studio at /create. Admins write books and
// submit them for review; super admins also approve them and manage the team.
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

  @Column({ type: 'varchar', length: 20, default: 'admin' })
  role: AdminRole;

  // Deactivated admins can't sign in. Accounts are never deleted so books
  // keep their author.
  @Column({ default: true })
  active: boolean;

  // Goes up on every password change or reset. Session tokens carry the
  // version they were issued at, so older sessions stop working.
  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion: number;

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
