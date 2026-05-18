import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '../ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Allow priority to be changed after creation (escalation/de-escalation).
   * The requester can change their own ticket; admins can change any.
   */
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
