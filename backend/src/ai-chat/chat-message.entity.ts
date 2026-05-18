import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export type ChatMessageRole = 'user' | 'assistant';

/**
 * A single turn in a chat session. The conversation history is replayed
 * to the model on every request, so we keep these rows immutable and
 * ordered by createdAt.
 */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ChatSession, (session) => session.messages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  session!: ChatSession;

  @Column({ type: 'text' })
  role!: ChatMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
