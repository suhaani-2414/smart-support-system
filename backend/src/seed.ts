import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { join } from 'path';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USERNAME ?? 'user',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_NAME ?? 'support_system',
  entities: [join(__dirname, '**', '*.entity{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
});

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'agent' | 'admin';
};

const seedUsers: SeedUser[] = [
  {
    name: 'Demo User',
    email: 'user@example.com',
    password: 'UserPassword123!',
    role: 'user',
  },
  {
    name: 'Demo Agent',
    email: 'agent@example.com',
    password: 'AgentPassword123!',
    role: 'agent',
  },
  {
    name: 'Demo Admin',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'admin',
  },
];

async function seed() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository<any>('User');

  for (const seedUser of seedUsers) {
    const existingUser = await userRepository.findOne({
      where: { email: seedUser.email },
    });

    const passwordHash = await bcrypt.hash(seedUser.password, 10);

    if (existingUser) {
      existingUser.name = seedUser.name;
      existingUser.password = passwordHash;
      existingUser.role = seedUser.role;
      existingUser.isActive = true;

      await userRepository.save(existingUser);
      console.log(`Updated existing user: ${seedUser.email}`);
    } else {
      const newUser = userRepository.create({
        name: seedUser.name,
        email: seedUser.email,
        password: passwordHash,
        role: seedUser.role,
        isActive: true,
      });

      await userRepository.save(newUser);
      console.log(`Created user: ${seedUser.email}`);
    }
  }

  await dataSource.destroy();
  console.log('Seeding completed successfully.');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});