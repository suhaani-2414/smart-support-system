import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { User } from './users/user.entity';
import { Role } from './users/enums/role.enum';
import { Ticket, TicketStatus } from './tickets/ticket.entity';
import { TicketStatusHistory } from './tickets/ticket-status-history.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USERNAME ?? 'user',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_NAME ?? 'support_system',
  entities: [User, Ticket, TicketStatusHistory],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
});

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive?: boolean;
};

type SeedTicket = {
  title: string;
  description: string;
  requesterEmail: string;
  assignedAgentEmail: string | null;
  status: TicketStatus;
};

const DEMO_USERS: SeedUser[] = [
  {
    name: 'Demo User',
    email: 'user@example.com',
    password: 'UserPassword123!',
    role: Role.USER,
  },
  {
    name: 'Demo User Two',
    email: 'user2@example.com',
    password: 'UserTwoPassword123!',
    role: Role.USER,
  },
  {
    name: 'Demo Agent A',
    email: 'agent@example.com',
    password: 'AgentPassword123!',
    role: Role.AGENT,
  },
  {
    name: 'Demo Agent B',
    email: 'agent2@example.com',
    password: 'AgentTwoPassword123!',
    role: Role.AGENT,
  },
  {
    name: 'Demo Admin',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: Role.ADMIN,
  },
];

const DEMO_TICKETS: SeedTicket[] = [
  {
    title: 'Cannot access billing portal',
    description:
      'The billing page returns a blank screen after login on Chrome 135.',
    requesterEmail: 'user@example.com',
    assignedAgentEmail: 'agent@example.com',
    status: TicketStatus.OPEN,
  },
  {
    title: 'Feature request for exported dark mode reports',
    description:
      'Please add dark mode friendly PDF exports for the reporting module.',
    requesterEmail: 'user@example.com',
    assignedAgentEmail: 'agent@example.com',
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: 'Password reset loop on mobile',
    description:
      'Reset link keeps returning the user to the same password reset form.',
    requesterEmail: 'user2@example.com',
    assignedAgentEmail: 'agent2@example.com',
    status: TicketStatus.OPEN,
  },
  {
    title: 'Invoice mismatch for March subscription',
    description:
      'The March invoice shows two seat upgrades that were never requested.',
    requesterEmail: 'user@example.com',
    assignedAgentEmail: 'agent2@example.com',
    status: TicketStatus.RESOLVED,
  },
  {
    title: 'SSO setup guidance needed',
    description:
      'Our team needs help configuring Google Workspace SSO for 14 users.',
    requesterEmail: 'user2@example.com',
    assignedAgentEmail: null,
    status: TicketStatus.OPEN,
  },
  {
    title: 'Two-factor authentication locked me out',
    description:
      'I changed devices and can no longer complete MFA when signing in.',
    requesterEmail: 'user@example.com',
    assignedAgentEmail: null,
    status: TicketStatus.OPEN,
  },
];

async function upsertUser(
  userRepository: Repository<User>,
  seedUser: SeedUser,
): Promise<User> {
  const existingUser = await userRepository.findOne({
    where: { email: seedUser.email },
  });

  const passwordHash = await bcrypt.hash(seedUser.password, 10);

  if (existingUser) {
    existingUser.name = seedUser.name;
    existingUser.password = passwordHash;
    existingUser.role = seedUser.role;
    existingUser.isActive = seedUser.isActive ?? true;
    return userRepository.save(existingUser);
  }

  const newUser = userRepository.create({
    name: seedUser.name,
    email: seedUser.email,
    password: passwordHash,
    role: seedUser.role,
    isActive: seedUser.isActive ?? true,
  });

  return userRepository.save(newUser);
}

async function recreateDemoTickets(
  ticketRepository: Repository<Ticket>,
  historyRepository: Repository<TicketStatusHistory>,
  usersByEmail: Map<string, User>,
): Promise<Ticket[]> {
  await historyRepository.createQueryBuilder().delete().execute();
  await ticketRepository.createQueryBuilder().delete().execute();

  const seededTickets: Ticket[] = [];

  for (const seedTicket of DEMO_TICKETS) {
    const requester = usersByEmail.get(seedTicket.requesterEmail);
    const assignedAgent = seedTicket.assignedAgentEmail
      ? usersByEmail.get(seedTicket.assignedAgentEmail) ?? null
      : null;

    if (!requester) {
      throw new Error(`Requester not found for ${seedTicket.title}`);
    }

    const ticket = ticketRepository.create({
      title: seedTicket.title,
      description: seedTicket.description,
      status: TicketStatus.OPEN,
      user: requester,
      agent: assignedAgent,
    });

    const createdTicket = await ticketRepository.save(ticket);

    await historyRepository.save(
      historyRepository.create({
        ticket: createdTicket,
        oldStatus: TicketStatus.OPEN,
        newStatus: TicketStatus.OPEN,
      }),
    );

    if (seedTicket.status !== TicketStatus.OPEN) {
      createdTicket.status = seedTicket.status;
      await ticketRepository.save(createdTicket);

      await historyRepository.save(
        historyRepository.create({
          ticket: createdTicket,
          oldStatus: TicketStatus.OPEN,
          newStatus: seedTicket.status,
        }),
      );
    }

    seededTickets.push(
      await ticketRepository.findOneOrFail({
        where: { id: createdTicket.id },
        relations: ['user', 'agent'],
      }),
    );
  }

  return seededTickets;
}

async function seed() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const ticketRepository = dataSource.getRepository(Ticket);
  const historyRepository = dataSource.getRepository(TicketStatusHistory);

  const usersByEmail = new Map<string, User>();

  for (const demoUser of DEMO_USERS) {
    const savedUser = await upsertUser(userRepository, demoUser);
    usersByEmail.set(savedUser.email, savedUser);
  }

  const seededTickets = await recreateDemoTickets(
    ticketRepository,
    historyRepository,
    usersByEmail,
  );

  console.table(
    Array.from(usersByEmail.values()).map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })),
  );

  console.table(
    seededTickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterEmail: ticket.user.email,
      assignedAgentEmail: ticket.agent?.email ?? null,
    })),
  );

  await dataSource.destroy();
  console.log('Seeding completed successfully.');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
