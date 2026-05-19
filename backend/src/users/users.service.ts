import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from './enums/role.enum';

/**
 * All read/write operations against the users table. Stays free of HTTP
 * concerns — the controller layer converts the exceptions thrown here
 * (NotFound, BadRequest, Conflict) into matching HTTP status codes.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Used by the login flow only. The password column is select:false on
   * the entity, so a plain find() never returns it; we use a query builder
   * with addSelect() to opt back in for this one query.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Lookup by id with the password hash safely excluded. Throws 404
   * instead of returning null so the caller doesn't have to null-check.
   */
  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /** Admin: full user roster, newest first. */
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Admin: queue of accounts waiting for approval. Sorted oldest-first
   * so admins handle the longest-waiting users before newer ones.
   */
  async findPendingUsers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { isPending: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Insert a new user. Password is expected to already be bcrypt-hashed
   * by AuthService — this service is intentionally ignorant of crypto.
   *
   * The unique constraint on email enforces no duplicates at the DB
   * level too; the manual findOne+throw here just produces a nicer
   * 409 Conflict than the raw DB error.
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Every new account is gated through admin approval — never trust
    // signup-side flags. The role from `data` is the requested role
    // (typically USER); an admin can change it at approval time.
    const user = this.usersRepository.create({
      ...data,
      isPending: true,
      isActive: false,
    });

    return this.usersRepository.save(user);
  }

  /**
   * Admin approval flow. Flips both flags atomically and optionally
   * overrides the role at the same time (so a user who signed up
   * normally can be promoted straight to AGENT or ADMIN).
   *
   * Rejects re-approving an already-approved account so the timeline
   * stays meaningful.
   */
  async approveAccount(id: number, role?: Role): Promise<User> {
    const user = await this.findById(id);

    if (!user.isPending) {
      throw new BadRequestException('Account has already been approved');
    }

    user.isPending = false;
    user.isActive = true;

    if (role) {
      user.role = role;
    }

    return this.usersRepository.save(user);
  }

  /**
   * Enable or disable an already-approved account. Different from approval —
   * this is for "this user left the team, deactivate their access" rather
   * than the initial onboarding gate.
   */
  async setAccountStatus(id: number, isActive: boolean): Promise<User> {
    const user = await this.findById(id);

    if (user.isPending) {
      throw new BadRequestException(
        'Cannot change status of a pending account — approve it first',
      );
    }

    user.isActive = isActive;
    return this.usersRepository.save(user);
  }

  /** Admin: promote/demote a user. No business logic — pure state change. */
  async updateRole(id: number, role: Role): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepository.save(user);
  }
}