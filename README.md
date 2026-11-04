# NaijaRemoteHub

A mobile-first Next.js application for a remote-work learning membership, Paystack NGN checkout, three-level referral accounting, member withdrawals and admin review.

## Included

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth (email/password), Postgres and Row Level Security
- Paystack transaction initialization, server-side verification and signed webhook
- Idempotent, server-side three-level commission processing
- Member dashboard, referral link, team counts, payment/commission history
- Withdrawal requests with atomic balance reservation and admin approval/rejection
- Admin-only member and transaction management
- Vercel-ready environment configuration

## Business and compliance note

This repository implements the requested referral accounting rules, but it does not establish that the business model is lawful. A programme that pays rewards primarily for recruiting paying members can raise pyramid-selling, consumer-protection, direct-selling and financial-promotion concerns. Before accepting real payments, have the model and marketing reviewed by a Nigerian lawyer and relevant regulators. Make sure membership fees pay for genuine, independently valuable training/services; publish clear refund, cancellation, eligibility and withdrawal terms; do not promise jobs or earnings. The website therefore describes rewards as conditional and does not guarantee income.

## 1. Requirements

- Node.js 20.9+ (Node 20 LTS recommended)
- npm
- Supabase project
- Paystack business account with test keys initially
- Vercel account
- GitHub repository

## 2. Install locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## 3. Create Supabase tables

1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**.
3. Copy all contents of `supabase/schema.sql` into the editor and run it.
4. In **Project Settings → API**, copy the Project URL, anon/public key and service_role key.
5. In **Authentication → URL Configuration**, set Site URL to your production URL and add redirect URLs:
   - `http://localhost:3000/**`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/**`
6. In **Authentication → Providers → Email**, enable email/password. For production, configure SMTP and decide whether email confirmation is required.
7. Keep the service role key private. It bypasses Row Level Security and must only exist in server-side environment variables.

The SQL creates `public.users`, `public.payments`, `public.referrals`, the auth profile trigger, RLS policies and server-only RPC functions. Do not add client-side policies that allow members to edit `balance`, `is_paid`, payments or commissions.

## 4. Configure Paystack

1. Open https://dashboard.paystack.com.
2. Use **test keys** while developing.
3. Add the secret key as `PAYSTACK_SECRET_KEY` and the public key as `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
4. Set the webhook URL to:
   `https://YOUR-DOMAIN/api/payments/webhook`
5. Subscribe to the `charge.success` event.
6. The server verifies the payment directly with Paystack and checks the exact NGN amount, currency and metadata before activating membership. The webhook signature is checked with HMAC SHA-512.
7. Test successful, failed, abandoned and duplicate callback/webhook cases before switching to live keys.

The checkout is initialized server-side. The public key is included in the environment template for future Paystack frontend integrations; this implementation does not expose the secret key to the browser.

## 5. Environment variables

Set these in `.env.local` for development and in Vercel Project Settings → Environment Variables for deployment:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-side key for trusted API operations |
| `PAYSTACK_SECRET_KEY` | Private Paystack secret |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `NEXT_PUBLIC_SITE_URL` | Canonical app URL, e.g. `https://your-domain.vercel.app` |
| `ADMIN_EMAIL` | Admin login email; default requested value is `naijaremotehub@gmail.com` |
| `NEXT_PUBLIC_VIP_TELEGRAM_URL` | Private Telegram invite link shown to active members |

Do not commit `.env.local` or any secret keys to GitHub.

## 6. Run checks

```bash
npm run build
```

For a production build, all required environment variables must be set. `npm run dev` runs the local development server.

## 7. Deploy to GitHub and Vercel

1. Create an empty GitHub repository named `naijaremotehub`.
2. Unzip/copy this repository into it.
3. Commit and push:

```bash
git init
git add .
git commit -m "Initial NaijaRemoteHub app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/naijaremotehub.git
git push -u origin main
```

4. In Vercel, choose **Add New → Project**, import the GitHub repository and keep the detected Next.js settings.
5. Add all environment variables from section 5 to the Vercel project. Set `NEXT_PUBLIC_SITE_URL` to the final production URL.
6. Deploy. Add the final Vercel URL to Supabase Auth redirect URLs and Paystack webhook configuration.
7. Redeploy after changing environment variables.

## 8. Admin access

Sign in with the exact email configured in `ADMIN_EMAIL`. The `/api/admin` route checks the authenticated Supabase user on the server. Only this account can list members, manually approve a membership or update withdrawal status. Configure a strong password and enable MFA for the admin account.

## 9. Payment and commission rules

- Membership is ₦25,000 and lasts 30 days from successful verification.
- Level 1 receives ₦8,000, Level 2 receives ₦4,000, Level 3 receives ₦2,000.
- Missing upline levels are skipped.
- The commission chain is read from the member's stored `referred_by` relationship.
- A unique Paystack membership reference and a database transaction prevent duplicate commission credit on retries.
- Admin manual approval creates an auditable synthetic membership reference and uses the same commission routine.
- Withdrawals reserve the balance immediately. Rejected requests return the reserved amount; paid requests remain deducted.

## 10. Important production tasks

Before going live:
- Obtain legal review of the referral compensation structure and marketing claims.
- Publish terms, privacy notice, refund policy, membership renewal/cancellation terms and withdrawal processing timelines.
- Configure production SMTP, domain, backups and monitoring.
- Test RLS using a non-admin account and verify that users cannot change balances or membership state.
- Confirm the actual training/job resources are available and updated as advertised.
- Add KYC, fraud controls, rate limiting and an audited payout reconciliation process appropriate to your business.
- Never pay out based only on a browser redirect; the signed webhook and Paystack server verification are the trusted payment sources.

## Routes

- `/` Home
- `/signup` Create account (optional `?ref=UUID`)
- `/login` Login
- `/dashboard` Member dashboard
- `/payment/verify` Paystack callback
- `/admin` Admin dashboard
- `/api/payments/initialize` Initialize Paystack checkout
- `/api/payments/verify` Verify checkout reference
- `/api/payments/webhook` Signed Paystack webhook
- `/api/withdrawals` Submit withdrawal
- `/api/admin` Admin data and actions
