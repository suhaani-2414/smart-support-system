import { Type } from 'class-transformer';
import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class AssignTicketDto {
  /**
   * One or more agent user IDs to assign to the ticket.
   * Sending this list replaces any existing assignment.
   * Admin only.
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  agentIds!: number[];
}