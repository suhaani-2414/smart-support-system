import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '../ticket.entity';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  /**
   * User-selected priority. Optional — when omitted, the entity default
   * (MEDIUM) is used. Any of: LOW, MEDIUM, HIGH.
   */
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
