import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ChatMessage } from './chat-message.entity';

/**
 * A single conversation thread between a user and the AI support assistant.
 * Sessions are private — only the owning user can list, read, or extend
 * them. The title is auto-generated from the first user message.
 */
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @Index()
  user!: User;

  @Column({ type: 'text', default: 'New conversation' })
  title!: string;

  @OneToMany(() => ChatMessage, (message) => message.session, {
    cascade: ['remove'],
  })
  messages!: ChatMessage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
