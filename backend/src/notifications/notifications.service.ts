import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';

/**
 * Internal type for the private `notify()` helper. Public callers don't
 * see this — they go through the typed `notifyAccountCreated`,
 * `notifyTicketResolved` etc. methods at the bottom.
 */
type NotifyArgs = {
  recipient: User;
  type: NotificationType;
  title: string;
  body: string;
  emailHtml: string;
  emailSubject: string;
  link?: string | null;
};

/**
 * The "unified notification" facade. Every place in the codebase that
 * used to send "just an email" now calls one of the typed notify*
 * methods below, which:
 *
 *   1. Insert a row into the notifications table so it shows up in the
 *      user's bell dropdown.
 *   2. Send the corresponding email via MailService.
 *
 * Single funnel ⇒ the bell and the inbox never go out of sync.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    private readonly mailService: MailService,
  ) {}

  /**
   * The one private path that all notify* methods funnel through.
   *
   * Order matters here: we await the DB save BEFORE firing the email.
   * The in-app notification is the canonical record of "we tried to
   * notify the user"; the email is best-effort delivery. If we got the
   * order reversed and the email succeeded but the DB write failed,
   * the user would see an email about a notification that's not in
   * their bell — confusing and hard to debug.
   */
  private async notify(args: NotifyArgs): Promise<Notification> {
    const entity = this.notificationsRepo.create({
      recipient: args.recipient,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link ?? null,
      isRead: false,
    });

    const saved = await this.notificationsRepo.save(entity);

    // Fire-and-forget. MailService.sendRaw doesn't throw, but if it
    // somehow did we'd still want the in-app notification to stand on
    // its own. The .catch() here is belt-and-braces.
    void this.mailService
      .sendRaw(args.recipient.email, args.emailSubject, args.emailHtml)
      .catch((err) => {
        this.logger.warn(
          `Email side of notification id=${saved.id} failed: ${err}`,
        );
      });

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Read API — backs the bell dropdown and the unread badge
  // ---------------------------------------------------------------------------

  /**
   * Most recent N notifications for the calling user, newest first.
   * Default limit of 30 keeps the bell dropdown fast even for users
   * who've accumulated thousands.
   */
  async findForUser(userId: number, limit = 30): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { recipient: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Used by the bell badge. Polled by the frontend every 30 seconds —
   * keep this query fast. The composite filter (recipient + isRead=false)
   * benefits from both indexes declared on the entity.
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepo.count({
      where: { recipient: { id: userId }, isRead: false },
    });
  }

  /**
   * Mark one notification as read. Includes an explicit ownership check:
   * a user can only update their OWN notifications. The check uses
   * ForbiddenException to make it clear this is a permissions failure
   * (not a not-found), which matters when debugging client-side bugs.
   */
  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    const notification = await this.notificationsRepo.findOne({
      where: { id: notificationId },
      relations: ['recipient'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient.id !== userId) {
      throw new ForbiddenException('You can only update your own notifications');
    }

    // Skip the save if it's already read — saves a round-trip.
    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationsRepo.save(notification);
    }

    return notification;
  }

  /**
   * Bulk "mark all as read" via a single UPDATE — no need to load and
   * save each row individually. The empty `affected` fallback handles
   * the edge case where the user had no unread notifications.
   */
  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const result = await this.notificationsRepo.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  // ---------------------------------------------------------------------------
  // Typed trigger methods. Each event type that fires a notification has
  // exactly one method below — keeps the content in one place rather than
  // scattered across callers, and makes it trivial to tweak wording.
  // ---------------------------------------------------------------------------

  notifyAccountCreated(user: User): Promise<Notification> {
    return this.notify({
      recipient: user,
      type: NotificationType.ACCOUNT_CREATED,
      title: 'Account created — pending approval',
      body: `Hi ${user.name}, your account has been received and is waiting for admin approval. You'll get another notification when it's ready.`,
      emailSubject: 'Account Created – Pending Admin Approval',
      emailHtml: `
        <p>Hi ${user.name},</p>
        <p>Thanks for registering! Your account has been created and is currently
        <strong>pending admin approval</strong>.</p>
        <p>You will receive another email as soon as your account has been approved
        and you can log in.</p>
        <p>— The Support Team</p>
      `,
    });
  }

  notifyAccountApproved(user: User): Promise<Notification> {
    return this.notify({
      recipient: user,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Account approved',
      body: `Your account has been approved — you can log in now.`,
      emailSubject: 'Account Approved – You Can Now Log In',
      emailHtml: `
        <p>Hi ${user.name},</p>
        <p>Great news — your account has been <strong>approved</strong>!
        You can now log in to the support system.</p>
        <p>— The Support Team</p>
      `,
    });
  }

  notifyTicketCreated(
    user: User,
    ticketId: number,
    ticketTitle: string,
  ): Promise<Notification> {
    return this.notify({
      recipient: user,
      type: NotificationType.TICKET_CREATED,
      title: `Ticket #${ticketId} created`,
      body: `Your ticket "${ticketTitle}" has been received. An agent will pick it up shortly.`,
      link: `/dashboard/tickets/${ticketId}`,
      emailSubject: `Ticket #${ticketId} Created Successfully`,
      emailHtml: `
        <p>Hi ${user.name},</p>
        <p>Your support ticket has been created:</p>
        <ul>
          <li><strong>ID:</strong> #${ticketId}</li>
          <li><strong>Subject:</strong> ${ticketTitle}</li>
        </ul>
        <p>An agent will be assigned shortly. You'll be notified when there are updates.</p>
        <p>— The Support Team</p>
      `,
    });
  }

  notifyTicketAssigned(
    agent: User,
    ticketId: number,
    ticketTitle: string,
  ): Promise<Notification> {
    return this.notify({
      recipient: agent,
      type: NotificationType.TICKET_ASSIGNED,
      title: `Assigned to ticket #${ticketId}`,
      body: `You've been assigned to "${ticketTitle}".`,
      link: `/dashboard/tickets/${ticketId}`,
      emailSubject: `You've been assigned ticket #${ticketId}`,
      emailHtml: `
        <p>Hi ${agent.name},</p>
        <p>You have been assigned to a support ticket:</p>
        <ul>
          <li><strong>ID:</strong> #${ticketId}</li>
          <li><strong>Subject:</strong> ${ticketTitle}</li>
        </ul>
        <p>Open the ticket in the support system to get started.</p>
        <p>— The Support Team</p>
      `,
    });
  }

  notifyTicketClaimed(
    requester: User,
    agentName: string,
    ticketId: number,
    ticketTitle: string,
  ): Promise<Notification> {
    return this.notify({
      recipient: requester,
      type: NotificationType.TICKET_CLAIMED,
      title: `Ticket #${ticketId} picked up`,
      body: `${agentName} has picked up your ticket "${ticketTitle}".`,
      link: `/dashboard/tickets/${ticketId}`,
      emailSubject: `Your ticket #${ticketId} has been picked up`,
      emailHtml: `
        <p>Hi ${requester.name},</p>
        <p><strong>${agentName}</strong> has picked up your support ticket:</p>
        <ul>
          <li><strong>ID:</strong> #${ticketId}</li>
          <li><strong>Subject:</strong> ${ticketTitle}</li>
        </ul>
        <p>They'll be in touch with you through the ticket conversation.</p>
        <p>— The Support Team</p>
      `,
    });
  }

  notifyTicketResolved(
    user: User,
    ticketId: number,
    ticketTitle: string,
  ): Promise<Notification> {
    return this.notify({
      recipient: user,
      type: NotificationType.TICKET_RESOLVED,
      title: `Ticket #${ticketId} resolved`,
      body: `Your ticket "${ticketTitle}" has been marked as resolved.`,
      link: `/dashboard/tickets/${ticketId}`,
      emailSubject: `Ticket #${ticketId} Has Been Resolved`,
      emailHtml: `
        <p>Hi ${user.name},</p>
        <p>Your support ticket has been marked as <strong>resolved</strong>:</p>
        <ul>
          <li><strong>ID:</strong> #${ticketId}</li>
          <li><strong>Subject:</strong> ${ticketTitle}</li>
        </ul>
        <p>If you have further questions or the issue persists, please open a new ticket.</p>
        <p>— The Support Team</p>
      `,
    });
  }
}