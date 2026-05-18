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

type NotifyArgs = {
  recipient: User;
  type: NotificationType;
  title: string;
  body: string;
  emailHtml: string;
  emailSubject: string;
  link?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    private readonly mailService: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Core: every "notify" call persists a row AND fires an email.
  // Email failures are swallowed by MailService — they never block the DB
  // write or the calling business operation.
  // ---------------------------------------------------------------------------

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

    // Fire-and-forget the email side. Errors are logged by MailService.
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
  // Public read API (called by NotificationsController)
  // ---------------------------------------------------------------------------

  /** Most recent notifications for the given user. */
  async findForUser(userId: number, limit = 30): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { recipient: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepo.count({
      where: { recipient: { id: userId }, isRead: false },
    });
  }

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

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationsRepo.save(notification);
    }

    return notification;
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const result = await this.notificationsRepo.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  // ---------------------------------------------------------------------------
  // Trigger points — one method per event type.
  // Each composes the in-app + email content and delegates to notify().
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
