import { NextResponse } from "next/server";
import { requireUser, authError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializePaystack } from "@/lib/paystack";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user.email) return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
    const db = createAdminClient();
    const { data: profile, error } = await db.from("users").select("is_paid,paid_until").eq("id",user.id).single();
    if (error || !profile) return NextResponse.json({ error: "Member profile not found." }, { status: 404 });
    if (profile.is_paid && profile.paid_until && new Date(profile.paid_until) > new Date()) {
      return NextResponse.json({ error: "Your membership is already active." }, { status: 409 });
    }
    const payment = await initializePaystack(user.email,user.id);
    return NextResponse.json({ authorization_url: payment.authorization_url });
  } catch (e) { return authError(e); }
}
