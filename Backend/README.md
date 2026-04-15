# smart-support-system

Full-stack Smart Support System (React + NestJS + PostgreSQL)

## CS447 Group Project — Support Ticket System Backend

## Authentication & Users Module

Handles user signup/login, JWT authentication, and role-based access control (USER / AGENT / ADMIN).

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

- **Use a Linux filesystem if on Windows** — run everything inside WSL at `~/` or `/home/`, not under `/mnt/c/`. Installing `node_modules` on a Windows-mounted drive causes permission errors and corrupted installs.

---

## 1. Getting Started


### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `@nestjs/config` v3 has a peer dep constraint that doesn't yet cover NestJS v11.

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:

```
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=8h
PORT=3000
```

Generate a strong secret with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the development server

```bash
npm run start:dev
```

The API will be available at **http://localhost:3000/api/v1**

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/signup` | Public | Create a new user account |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT token |
| POST | `/api/v1/auth/logout` | Authenticated | Logout (client discards token) |

**Signup body:**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123" }
```

**Login body:**
```json
{ "email": "jane@example.com", "password": "password123" }
```

**Login response:**
```json
{ "accessToken": "<jwt>" }
```

Include the token in subsequent requests:
```
Authorization: Bearer <accessToken>
```

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/users/me` | Authenticated | Get your own profile |
| GET | `/api/v1/users` | Admin only | List all users |
| GET | `/api/v1/users/:id` | Admin / Agent | Get a user by ID |
| PATCH | `/api/v1/users/:id/status` | Admin only | Enable/disable an account (`{ "isActive": false }`) |
| PATCH | `/api/v1/users/:id/role` | Admin only | Change a user's role (`{ "role": "agent" }`) |

---

## Project Structure

```
src/
├── main.ts                  # Bootstrap, global ValidationPipe
├── app.module.ts            # Root module (TypeORM, ConfigModule)
├── auth/
│   ├── auth.controller.ts   # signup / login / logout routes
│   ├── auth.service.ts      # bcrypt hashing, JWT signing
│   ├── auth.guard.ts        # JwtAuthGuard — protects routes
│   ├── auth.module.ts
│   ├── jwt.strategy.ts      # Validates Bearer tokens
│   ├── roles.guard.ts       # Enforces @Roles() decorator
│   ├── roles.decorator.ts
│   └── dto/
│       ├── signup.dto.ts
│       └── login.dto.ts
└── users/
    ├── user.entity.ts       # TypeORM entity (id, name, email, role, isActive)
    ├── users.service.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── enums/
        └── role.enum.ts     # Role.USER | Role.ADMIN | Role.AGENT
```

---

## Database

Uses **SQLite** by default (zero config). The database file `support_system.db` is created automatically on first run and is excluded from git.

To switch to PostgreSQL/MySQL for production, update the `TypeOrmModule.forRoot()` config in `src/app.module.ts`.

---

## Run Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

---

## Build for Production

```bash
npm run build
npm run start:prod
```

