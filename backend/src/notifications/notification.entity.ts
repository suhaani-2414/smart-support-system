import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_CLAIMED = 'TICKET_CLAIMED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}

/**
 * One row per in-app notification delivered to a user.
 * The corresponding email is sent in the same code path (see
 * NotificationsService.notify) so the bell and the inbox stay in sync.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Who should see this in the bell dropdown. */
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
   * Optional deep-link target — e.g. /dashboard/tickets/123 — that the
   * UI can navigate to when the notification is clicked.
   */
  @Column({ type: 'text', nullable: true })
  link!: string | null;

  @Column({ default: false })
  @Index()
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
