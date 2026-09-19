import type { DefaultSession } from "next-auth";

export type UserRole = "admin" | "member";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// The credentials provider's authorize() return type, and the `user` param
// in the jwt() callback, resolve to @auth/core/types's User directly (some
// next-auth internals import it from there rather than through next-auth's
// own re-export) — augmenting only "next-auth" above doesn't reach those.
declare module "@auth/core/types" {
  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
