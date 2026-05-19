import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * The six events that can fire a notification. Each value corresponds to
 * a typed trigger method on NotificationsService (notifyAccountCreated,
 * notifyTicketResolved, etc.). Storing as a plain text column keeps it
 * extensible — adding a new type doesn't require a DB migration.
 */
export enum NotificationType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_CLAIMED = 'TICKET_CLAIMED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}

/**
 * One row per in-app notification. The DB row and the corresponding
 * email are produced together in NotificationsService.notify, so the
 * bell dropdown and the user's inbox stay in lockstep.
 *
 * Indexes:
 *   - recipient: every read query filters by user, so an FK index keeps
 *     "give me Alice's notifications" fast even at large row counts.
 *   - isRead: the unread-count badge polls every 30 seconds for every
 *     active session; the partial filter benefits from a column index.
 *
 * onDelete: 'CASCADE' on the recipient FK means deleting a user
 * automatically deletes their notifications at the database level — no
 * orphan rows to clean up.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @Index()
  recipient!: User;

  @Column({ type: 'text' })
  type!: NotificationType;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  /**
   * Deep-link target for click-through (e.g. /dashboard/tickets/123).
   * Nullable because some notifications — like "account approved" —
   * don't naturally point anywhere specific.
   */
  @Column({ type: 'text', nullable: true })
  link!: string | null;

  @Column({ default: false })
  @Index()
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}