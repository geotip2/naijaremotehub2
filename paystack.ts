const PAYSTACK_API = "https://api.paystack.co";

export async function initializePaystack(email: string, userId: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: 2_500_000,
      currency: "NGN",
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/verify`,
      metadata: { user_id: userId, product: "NaijaRemoteHub 30-day membership" }
    }),
    cache: "no-store"
  });
  const result = await response.json();
  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(result.message || "Could not initialize payment.");
  }
  return result.data as { authorization_url: string; reference: string };
}

export async function verifyPaystack(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store"
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message || "Payment verification failed.");
  return result.data;
}
