import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from './enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Find a user by email — includes password hash for auth validation */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Find a user by id (password excluded by default via entity column config) */
  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /** Find all users — used by admin */
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  /** Create a new user (password must already be hashed) */
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
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  /** Admin: toggle active/inactive status for a user account */
  async setAccountStatus(id: number, isActive: boolean): Promise<User> {
    const user = await this.findById(id);
    user.isActive = isActive;
    return this.usersRepository.save(user);
  }

  /** Admin: change a user's role */
  async updateRole(id: number, role: Role): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepository.save(user);
  }
}
