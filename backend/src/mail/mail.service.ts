import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends transactional email via Resend's REST API.
 *
 * Design choices worth knowing:
 *
 *   - Direct fetch, no SDK. Resend has an official SDK but it's a
 *     dependency for one HTTP call. Node 20+ ships fetch natively.
 *
 *   - Failures never throw. Every method catches and logs. The whole
 *     notification flow is fire-and-forget from the business code's
 *     perspective — a Resend outage must not break ticket creation.
 *
 *   - Degrades gracefully without an API key. If RESEND_API_KEY isn't
 *     set, we just log "skipping email" and return — the in-app
 *     notifications still get written to the DB.
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

  /**
   * Nest calls this once after construction. We use it to warn at
   * startup if the API key is missing, rather than silently doing
   * nothing — a noisy log is far easier to debug than a missing email.
   */
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
   * The single low-level send method. Everything else in this service
   * (and the public API used by NotificationsService) goes through here.
   *
   * Resend API contract:
   *   POST https://api.resend.com/emails
   *   Authorization: Bearer <api-key>
   *   Body: { from, to: string[], subject, html }
   *   Success: 200 with { id: "<message-id>" }
   *   Failure: 4xx with { name, message, statusCode }
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
      // Network-level failure (DNS, TCP, etc.). Log and bail.
      this.logger.error(
        `Could not reach Resend → ${to} | ${subject} | ${(err as Error).message}`,
      );
      return;
    }

    if (!response.ok) {
      // Read the response body for debugging context. Truncated to
      // 300 chars so a chatty error doesn't fill the log.
      const body = await response.text().catch(() => '');
      // 422 = unverified domain or malformed address (most common in dev)
      // 401/403 = wrong API key
      // 429 = rate limited
      this.logger.error(
        `Resend rejected message → ${to} | ${subject} | ` +
          `status=${response.status} body=${body.slice(0, 300)}`,
      );
      return;
    }

    // Success path: pull the Resend message id for the log line. This
    // is helpful for cross-referencing with Resend's own dashboard.
    let id = '?';
    try {
      const data = (await response.json()) as { id?: string };
      if (data?.id) id = data.id;
    } catch {
      // Body wasn't valid JSON — non-fatal, just skip the id.
    }

    this.logger.log(`Email sent → ${to} | ${subject} | resend_id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // Typed convenience wrappers. NotificationsService is the primary user of
  // sendRaw above, but these stick around in case other code wants to email
  // someone without going through the full notification pipeline.
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