import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './enums/role.enum';

/**
 * The `users` table. Decorators on each field tell TypeORM how to map
 * the class onto SQL — the column type, length, default value, and so on.
 *
 * Two flags drive the approval lifecycle:
 *   isPending: true at signup → set to false once an admin approves
 *   isActive:  false at signup → set to true when approved; can be
 *              flipped back to false to "deactivate" an account later
 *
 * Both are needed because they represent different states:
 *   pending=true, active=false   → awaiting first-time approval
 *   pending=false, active=true   → approved, can log in
 *   pending=false, active=false  → previously approved but now disabled
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  // unique:true creates a UNIQUE INDEX in Postgres so duplicate signups
  // fail at the DB level, not just in app code.
  @Column({ unique: true, length: 255 })
  email!: string;

  // select:false means default SELECT queries omit this column — so
  // accidental serialisation of a User won't leak the bcrypt hash.
  // The auth service explicitly opts back in via addSelect() when it
  // needs the hash for login.
  @Column({ select: false })
  password!: string;

  @Column({ type: 'text', default: Role.USER })
  role!: Role;

  @Column({ default: true })
  isPending!: boolean;

  @Column({ default: false })
  isActive!: boolean;

  // TypeORM fills these in automatically — no need to set them in code.
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}