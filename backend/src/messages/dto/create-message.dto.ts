import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @Type(() => Number)
  @IsInt()
  ticketId!: number;

  @Type(() => Number)
  @IsInt()
  senderId!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
