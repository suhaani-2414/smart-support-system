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