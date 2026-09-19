// Server-side data access for `users` (Stage: user management). Kept
// separate from the route handlers so they stay thin, matching
// lib/pr-records.ts / lib/reports.ts.
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export class UserManagementError extends Error {}

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  isActive: boolean;
  createdAt: string;
};

function toSummary(row: typeof schema.users.$inferSelect): UserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === "admin" ? "admin" : "member",
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUsers(): Promise<UserSummary[]> {
  const rows = await db.select().from(schema.users).orderBy(schema.users.createdAt);
  return rows.map(toSummary);
}

export async function getUser(id: string): Promise<UserSummary | null> {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return row ? toSummary(row) : null;
}

async function countActiveAdmins(excludingId?: string): Promise<number> {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      excludingId
        ? and(eq(schema.users.role, "admin"), eq(schema.users.isActive, true), ne(schema.users.id, excludingId))
        : and(eq(schema.users.role, "admin"), eq(schema.users.isActive, true)),
    );
  return rows.length;
}

function assertPasswordOk(password: string): void {
  if (!password || password.length < 8) {
    throw new UserManagementError("Password must be at least 8 characters.");
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}): Promise<UserSummary> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new UserManagementError("Name is required.");
  if (!email || !email.includes("@")) throw new UserManagementError("A valid email is required.");
  assertPasswordOk(input.password);

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) throw new UserManagementError("A user with that email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const [row] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash, role: input.role === "admin" ? "admin" : "member" })
    .returning();
  return toSummary(row);
}

// Guards against ever leaving zero active admins (which would lock everyone
// out of user management with no way back in short of a direct DB edit).
export async function updateUserRole(id: string, role: "admin" | "member"): Promise<UserSummary> {
  if (role === "member") {
    const remainingAdmins = await countActiveAdmins(id);
    if (remainingAdmins === 0) {
      throw new UserManagementError("Can't remove the last admin — promote someone else first.");
    }
  }
  const [row] = await db.update(schema.users).set({ role }).where(eq(schema.users.id, id)).returning();
  if (!row) throw new UserManagementError("User not found.");
  return toSummary(row);
}

export async function setUserActive(id: string, isActive: boolean, actingUserId: string): Promise<UserSummary> {
  if (!isActive) {
    if (id === actingUserId) {
      throw new UserManagementError("You can't deactivate your own account.");
    }
    const remainingAdmins = await countActiveAdmins(id);
    const [target] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (target?.role === "admin" && remainingAdmins === 0) {
      throw new UserManagementError("Can't deactivate the last admin — promote someone else first.");
    }
  }
  const [row] = await db.update(schema.users).set({ isActive }).where(eq(schema.users.id, id)).returning();
  if (!row) throw new UserManagementError("User not found.");
  return toSummary(row);
}

// Admin resets someone else's password (no knowledge of the old one needed —
// that's the point: it's for when a user is locked out).
export async function adminResetPassword(id: string, newPassword: string): Promise<void> {
  assertPasswordOk(newPassword);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const [row] = await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, id)).returning({ id: schema.users.id });
  if (!row) throw new UserManagementError("User not found.");
}

// Self-service password change — requires the current password, unlike the
// admin reset above.
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertPasswordOk(newPassword);
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) throw new UserManagementError("User not found.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new UserManagementError("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}
