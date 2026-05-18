import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * MailService — sends transactional email via Resend's REST API.
 *
 * Why Resend (May 2026):
 * - 3,000 emails/month and 100/day on the forever-free tier, no card required.
 * - Simple REST API; no SMTP, no nodemailer dependency.
 * - For dev you can send from `onboarding@resend.dev` (no domain setup) to
 *   the email address you signed up with. For prod, verify a domain via
 *   DNS at https://resend.com/domains.
 *
 * The public interface (`sendRaw` plus the typed wrappers) is unchanged
 * from the nodemailer version, so NotificationsService keeps working
 * without modification.
 *
 * Email failures are LOGGED, not thrown. Business flows (signup, approval,
 * ticket events) must never break because of a delivery failure.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  private readonly apiKey: string | undefined;
  private readonly from: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>(
      'MAIL_FROM',
      'Support System <onboarding@resend.dev>',
    );
    this.endpoint = this.configService.get<string>(
      'RESEND_ENDPOINT',
      'https://api.resend.com/emails',
    );
  }

  onModuleInit(): void {
    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — email delivery is DISABLED. ' +
          'In-app notifications still work; emails will be skipped with a log entry. ' +
          'Get a free key at https://resend.com/api-keys',
      );
    }
  }

  /**
   * Low-level send. Used by NotificationsService and (legacy) by the typed
   * wrappers below.
   *
   * Errors and non-2xx responses are caught and logged; this method never
   * throws. NotificationsService relies on that contract.
   */
  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`Skipping email (no API key) → ${to} | ${subject}`);
      return;
    }

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          html,
        }),
      });
    } catch (err) {
      this.logger.error(
        `Could not reach Resend → ${to} | ${subject} | ${(err as Error).message}`,
      );
      return;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // 422 from Resend usually means an unverified domain or a malformed
      // address. 401/403 means the key is wrong. 429 means rate-limited.
      this.logger.error(
        `Resend rejected message → ${to} | ${subject} | ` +
          `status=${response.status} body=${body.slice(0, 300)}`,
      );
      return;
    }

    let id = '?';
    try {
      const data = (await response.json()) as { id?: string };
      if (data?.id) id = data.id;
    } catch {
      // Non-fatal — we'll just log without an id
    }

    this.logger.log(`Email sent → ${to} | ${subject} | resend_id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // Typed wrappers — kept for backwards compatibility with any code path that
  // hasn't migrated to NotificationsService yet. Each builds the HTML body
  // and delegates to sendRaw().
  // ---------------------------------------------------------------------------

  async sendAccountCreated(name: string, email: string): Promise<void> {
    await this.sendRaw(
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

  async sendAccountApproved(name: string, email: string): Promise<void> {
    await this.sendRaw(
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

  async sendTicketCreated(
    name: string,
    email: string,
    ticketId: number,
    title: string,
  ): Promise<void> {
    await this.sendRaw(
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

  async sendTicketResolved(
    name: string,
    email: string,
    ticketId: number,
    title: string,
  ): Promise<void> {
    await this.sendRaw(
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
