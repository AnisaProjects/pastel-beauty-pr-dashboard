// NextAuth v5 (Auth.js) config — Credentials provider, JWT sessions (no
// `sessions` table needed). User accounts are created only via
// `scripts/seed-users.ts`; there is intentionally no signup route.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db, schema } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Short-ish session lifetime (not NextAuth's 30-day default): role changes
  // and deactivation are only re-checked against the database at login
  // (authorize()), not on every request, so a shorter session keeps that gap
  // small without needing a database lookup on every page/API request.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // The next-auth/@auth-core ambient type augmentation in lib/auth.d.ts
    // doesn't reliably reach every internal touchpoint in this version (the
    // credentials provider's `user` param, in particular) — these casts read
    // the field we know authorize() actually set at runtime rather than
    // fighting the declared type.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role === "admin" ? "admin" : "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        (session.user as { role?: string }).role = token.role === "admin" ? "admin" : "member";
      }
      return session;
    },
  },
});
