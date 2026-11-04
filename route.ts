import { NextResponse } from "next/server";
import { requireUser, authError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user=await requireUser(); const db=createAdminClient();
    const [{data:profile,error:pErr},{data:payments},{data:referrals},{data:team}] = await Promise.all([
      db.from("users").select("id,email,balance,is_paid,paid_until,bank_name,bank_account,referred_by,created_at").eq("id",user.id).single(),
      db.from("payments").select("id,type,amount,status,level,created_at,paystack_ref").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50),
      db.from("referrals").select("id,referrer_id,referee_id,level,amount,status,created_at").eq("referrer_id",user.id).order("created_at",{ascending:false}).limit(100),
      db.rpc("get_team_counts",{p_user_id:user.id})
    ]);
    if(pErr||!profile) return NextResponse.json({error:"Member profile not found."},{status:404});
    return NextResponse.json({profile,payments:payments||[],referrals:referrals||[],team:team||{level1:0,level2:0,level3:0},siteUrl:process.env.NEXT_PUBLIC_SITE_URL||new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").origin});
  } catch(e){return authError(e);}
}
