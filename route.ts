import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const secret = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secret || !signature) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a,b)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const event = JSON.parse(raw);
  if (event.event === "charge.success") {
    const tx = event.data;
    if (tx.status === "success" && Number(tx.amount) === 2_500_000 && tx.currency === "NGN" && tx.metadata?.user_id) {
      const db = createAdminClient();
      const { error } = await db.rpc("finalize_membership_payment", {
        p_user_id: tx.metadata.user_id, p_reference: tx.reference, p_amount: 25000
      });
      if (error && !error.message.toLowerCase().includes("already processed")) {
        console.error("Paystack webhook processing failed:", error.message);
        return NextResponse.json({ error: "Could not process payment" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
