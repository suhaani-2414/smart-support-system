import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>(
      'MAIL_FROM',
      'Support System <noreply@support.example.com>',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.example.com'),
      port: Number(this.configService.get<string>('MAIL_PORT', '587')),
      secure: this.configService.get<string>('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER', ''),
        pass: this.configService.get<string>('MAIL_PASS', ''),
      },
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (error) {
      // Log but never throw — email failures must not break primary flows.
      this.logger.error(`Failed to send email → ${to} | ${subject}`, error);
    }
  }

  /** Sent immediately after a new account is created. */
  async sendAccountCreated(name: string, email: string): Promise<void> {
    await this.send(
      email,
      'Account Created – Pending Admin Approval',
      `
      <p>Hi ${name},</p>
      <p>Thanks for registering! Your account has been created and is currently
      <strong>pending admin approval</strong>.</p>
      <p>You will receive another email as soon as your account has been approved
      and you can log in.</p>
      <p>— The Support Team</p>
      `,
    );
  }

  /** Sent when an admin approves a pending account. */
  async sendAccountApproved(name: string, email: string): Promise<void> {
    await this.send(
      email,
      'Account Approved – You Can Now Log In',
      `
      <p>Hi ${name},</p>
      <p>Great news — your account has been <strong>approved</strong>!
      You can now log in to the support system.</p>
      <p>— The Support Team</p>
      `,
    );
  }

  /** Sent to the user who opened the ticket after it is created. */
  async sendTicketCreated(
    name: string,
    email: string,
    ticketId: number,
    title: string,
  ): Promise<void> {
    await this.send(
      email,
      `Ticket #${ticketId} Created Successfully`,
      `
      <p>Hi ${name},</p>
      <p>Your support ticket has been created:</p>
      <ul>
        <li><strong>ID:</strong> #${ticketId}</li>
        <li><strong>Subject:</strong> ${title}</li>
      </ul>
      <p>An agent will be assigned shortly. You'll be notified when there are updates.</p>
      <p>— The Support Team</p>
      `,
    );
  }

  /** Sent to the user when their ticket status changes to RESOLVED. */
  async sendTicketResolved(
    name: string,
    email: string,
    ticketId: number,
    title: string,
  ): Promise<void> {
    await this.send(
      email,
      `Ticket #${ticketId} Has Been Resolved`,
      `
      <p>Hi ${name},</p>
      <p>Your support ticket has been marked as <strong>resolved</strong>:</p>
      <ul>
        <li><strong>ID:</strong> #${ticketId}</li>
        <li><strong>Subject:</strong> ${title}</li>
      </ul>
      <p>If you have further questions or the issue persists, please open a new ticket.</p>
      <p>— The Support Team</p>
      `,
    );
  }
}