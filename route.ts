import { NextResponse } from "next/server";
import { requireUser, authError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystack } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(()=>({}));
    const reference = typeof body.reference === "string" ? body.reference : "";
    if (!reference) return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    const payment = await verifyPaystack(reference);
    if (payment.status !== "success" || Number(payment.amount) !== 2_500_000 || payment.currency !== "NGN" || payment.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Payment could not be verified for this account." }, { status: 400 });
    }
    const db = createAdminClient();
    const { error } = await db.rpc("finalize_membership_payment", {
      p_user_id: user.id, p_reference: reference, p_amount: 25000
    });
    if (error) {
      if (error.message.toLowerCase().includes("already processed")) return NextResponse.json({ ok: true, message: "Payment was already processed." });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
