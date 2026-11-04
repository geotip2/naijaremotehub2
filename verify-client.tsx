"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentVerifyClient({ reference }: { reference: string }) {
  const [message,setMessage]=useState("Verifying your payment…");
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!reference){setMessage("No payment reference was found.");setFailed(true);return;}
    fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference})})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Payment verification failed.");setMessage("Payment confirmed. Your 30-day membership is now active.");})
      .catch(e=>{setFailed(true);setMessage(e.message);});
  },[reference]);
  return <main className="mx-auto max-w-lg px-4 py-20"><div className="card text-center">
    <div className="text-4xl">{failed?"⚠️":"✓"}</div><h1 className="mt-4 text-2xl font-black text-emerald-950">Payment status</h1>
    <p className="mt-3 text-slate-600">{message}</p><Link className="btn-primary mt-6" href="/dashboard">Go to dashboard</Link>
  </div></main>;
}
