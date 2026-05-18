import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity()
export class TicketStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  ticket!: Ticket;

  @Column()
  oldStatus!: string;

  @Column()
  newStatus!: string;

  @CreateDateColumn()
  changedAt!: Date;
}