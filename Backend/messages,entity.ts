//creates message object using strings. string objects have bang (!) symbol as data will be sent from database
export class Message {
  id!: string;
  ticketId!: string;
  senderId!: string;
  senderRole!: 'agent' | 'user';
  content!: string;
  createdAt!: Date;
}