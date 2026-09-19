import { NextRequest, NextResponse } from "next/server";

import { createUser, listUsers, UserManagementError } from "@/lib/users";
import { ForbiddenError, requireAdminUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET/POST /api/users — admin-only user management (list, create).
export async function GET() {
  try {
    await requireAdminUserId();
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUserId();
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  try {
    const body = await req.json();
    const user = await createUser({
      name: typeof body?.name === "string" ? body.name : "",
      email: typeof body?.email === "string" ? body.email : "",
      password: typeof body?.password === "string" ? body.password : "",
      role: body?.role === "admin" ? "admin" : "member",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof UserManagementError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("POST /api/users failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
