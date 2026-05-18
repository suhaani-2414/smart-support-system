import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  description!: string;

  @Column({
    type: 'text',
    default: TicketStatus.OPEN,
  })
  status!: TicketStatus;

  /**
   * User-selected priority captured at ticket creation.
   * Admins (and the requester) can change it later via PATCH /tickets/:id.
   */
  @Column({
    type: 'text',
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  /**
   * Soft-archive flag (admin only). Archived tickets are hidden from default
   * listings — admins can opt-in to see them with ?archived=true.
   * Distinct from soft-delete: archive is reversible.
   */
  @Column({ default: false })
  isArchived!: boolean;

  /** When the archive flag was set (null when active). */
  @Column({ type: 'timestamp', nullable: true })
  archivedAt!: Date | null;

  /** The user who opened the ticket */
  @ManyToOne(() => User, { nullable: false })
  user!: User;

  /**
   * Agents assigned to this ticket.
   * - An agent can self-assign (claim) an unassigned ticket.
   * - An admin can assign one or multiple agents at once.
   * Empty array means the ticket is unassigned.
   */
  @ManyToMany(() => User, { eager: false })
  @JoinTable({ name: 'ticket_agents' })
  agents!: User[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
