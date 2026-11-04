import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) throw new Error("FORBIDDEN");
  return user;
}

export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}
