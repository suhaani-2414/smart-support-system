//creates message object using strings in dto. string objects have bang (!) symbol as data will be sent from database
export class CreateMessageDto {
  ticketId!: string;
  content!: string;
  senderId!: string;
}