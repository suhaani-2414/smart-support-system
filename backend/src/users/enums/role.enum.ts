/**
 * Three roles drive every authorization decision in the system. Stored
 * lowercase in the `role` column of the users table; the enum keys are
 * uppercase by Java/TS convention.
 *
 * - USER: end customers. Can open and read their own tickets.
 * - AGENT: support staff. Can claim unassigned tickets and respond to
 *   any ticket they're assigned to.
 * - ADMIN: system administrators. Approve new accounts, assign agents,
 *   archive tickets, change roles.
 */
export enum Role {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin',
}