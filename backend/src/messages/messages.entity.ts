import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { Role } from '../users/enums/role.enum';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'CASCADE' })
  ticket!: Ticket;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  sender!: User;

  @Column({ type: 'text' })
  senderRole!: Role;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
