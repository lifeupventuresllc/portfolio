# Backend Flow Documentation

## Architecture Overview

**Stack**: Next.js 14 (App Router) + Supabase (Auth/DB) + Stripe (Payments) + Resend (Email)

### Data Model

```
auth.users (Supabase Auth)
  └── profiles (1:1) — id, email, role, created_at
        ├── purchases (1:many) — links user to product, tracks payment
        ├── emails (1:many) — log of emails sent
        └── affiliates (1:1) — referral code, commission rate

products — id, name, description, price, slug, category, sort_order, active
events — id, user_id (nullable), event_type, metadata (JSONB), created_at
daily_metrics — id, date (unique), total_users, total_customers, total_revenue, total_sales, total_refunds
webhooks — id, url, events[], secret, active
referrals — id, affiliate_id, referred_user_id, purchase_id, commission_amount, status
```

### Roles

| Role     | Access                                         |
|----------|-------------------------------------------------|
| free     | Landing page, locked content view               |
| customer | Landing page, unlocked content                  |
| support  | All of the above + admin dashboard (read only)  |
| admin    | Full access + admin actions + affiliates        |

---

## Authentication Flow

```
1. User visits /signup
2. Fills out email + password form
3. Supabase Auth creates user in auth.users
4. Database trigger (handle_new_user) fires:
   - Creates profile in profiles table (role: 'free')
   - Logs signup email in emails table
5. User receives confirmation email
6. User clicks confirm link → redirected to /api/auth/callback
7. Callback route:
   a. Exchanges auth code for session
   b. Sends welcome email via Resend
   c. Logs welcome email in emails table
8. User visits /login → enters credentials
9. Supabase Auth issues session cookie
10. Middleware reads cookie on every request:
    - Protected routes (/content, /admin) → redirect to /login if no session
    - Admin routes → checks profile.role in ('admin', 'support')
    - Auth routes (/login, /signup) → redirect to / if already logged in
    - Captures ?ref= affiliate codes into cookie
```

### Password Reset

```
1. User visits /reset-password
2. Enters email → Supabase sends reset link
3. User clicks link → redirected to /reset-password?step=update
4. Enters new password → Supabase updates auth.users
```

---

## Payment Flow

```
1. User clicks "Get Started Now" on landing page
2. Client tracks 'checkout_started' event
3. Client checks if user is logged in
   - Not logged in → redirect to /login?redirect=/content
   - Logged in → continue
4. Client POSTs to /api/checkout with { productId }
5. Server:
   a. Verifies user is authenticated
   b. Fetches product from database
   c. Checks for existing purchase (prevents double-purchase)
   d. Reads affiliate_ref cookie (if present)
   e. Creates Stripe Checkout session with metadata (userId, productId, affiliateCode)
   f. Returns checkout URL
6. Client redirects to Stripe Checkout
7. User completes payment (test card: 4242 4242 4242 4242)
8. Stripe sends webhook to /api/webhooks/stripe
9. Webhook handler:
   a. Verifies webhook signature
   b. Checks for idempotency (duplicate session ID)
   c. Inserts purchase record (status: 'completed')
   d. Updates profile role to 'customer'
   e. Logs purchase email in emails table
   f. Sends purchase confirmation email via Resend
   g. Processes affiliate referral (if affiliateCode in metadata)
   h. Dispatches outbound webhooks (purchase.completed)
10. User is redirected to /content?success=true
11. Content page checks purchases table → shows unlocked content
```

### Refund Flow

```
1. Admin visits /admin → Payments tab
2. Clicks "Refund" on a completed purchase
3. Client POSTs to /api/admin/refund with { purchaseId, paymentIntent }
4. Server:
   a. Verifies admin role
   b. Creates refund in Stripe
   c. Updates purchase status to 'refunded'
   d. If no other completed purchases, reverts role to 'free'
5. Stripe webhook (charge.refunded) fires as backup:
   - Same logic as step 4c-4d for idempotency
   - Sends refund confirmation email via Resend
   - Dispatches outbound webhooks (purchase.refunded)
```

---

## Admin Flow

```
1. Admin or support user logs in
2. Middleware checks profile.role in ('admin', 'support')
3. Admin dashboard loads:
   a. Fetches all profiles, purchases, emails, daily metrics, events
   b. Computes KPIs:
      - Total users, customers
      - Total sales, revenue
      - Conversion rate (purchases / signups)
      - Refund rate (refunds / total purchases)
      - Retention rate (active customers / total who purchased)
4. Dashboard tabs:
   - Overview: KPI cards, signup/revenue trends, funnel, recent activity
   - Users: Search/filter, role management (admin only)
   - Payments: Filter by status/date, refunds (admin only)
   - Emails: CRM view of all sent emails by type
   - Affiliates: Create/manage affiliates, view referrals (admin only)
5. Support role: read-only access (no refunds, no role changes, no affiliates)
```

---

## Email Notifications

**Provider**: Resend (via `lib/email.ts`)
**From**: `noreply@asaluke.io`

| Trigger | Email Type | Content |
|---------|-----------|---------|
| Email confirmed (auth callback) | Welcome | Program overview, CTA |
| Day 3 after signup (cron) | Onboarding Day 3 | Getting started tips |
| Day 7 after signup (cron) | Onboarding Day 7 | Program reminder, CTA |
| Purchase completed (webhook) | Purchase confirmation | Product name, amount, content link |
| Refund processed (webhook) | Refund confirmation | Product name, refund amount |

```
Onboarding sequence:
1. Vercel cron hits /api/cron/daily at 9am UTC daily
2. Cron handler queries profiles created 3 and 7 days ago
3. Checks emails table to avoid duplicates
4. Sends onboarding emails via Resend
5. Logs each email in emails table
6. Same cron also snapshots daily_metrics table
```

**Env vars required**: `RESEND_API_KEY`, `FROM_EMAIL`, `CRON_SECRET`
**Domain**: asaluke.io must be verified in Resend dashboard

---

## Funnel Tracking

Events tracked via `/api/events` and stored in `events` table:

| Event | Trigger |
|-------|---------|
| `checkout_started` | User clicks buy button |

Additional funnel data derived from:
- Total signups = profiles count
- Total purchases = completed purchases count
- Displayed in admin dashboard Funnel section

---

## Affiliate System

```
1. Admin creates affiliate in /admin → Affiliates tab
   - Assigns user, referral code, commission rate (default 20%)
2. Affiliate shares link: asaluke.io/?ref=CODE
3. Middleware detects ?ref= parameter → sets 30-day cookie
4. When user purchases:
   a. Checkout route reads affiliate_ref cookie
   b. Passes affiliateCode in Stripe session metadata
   c. Webhook processes affiliate after purchase:
      - Looks up affiliate by code
      - Calculates commission (amount × rate)
      - Creates referral record (status: 'earned')
5. Admin views referrals and earnings in Affiliates tab
```

---

## Outbound Webhooks

External services can receive events via registered webhook URLs.

| Event | Fired When |
|-------|-----------|
| `purchase.completed` | Successful purchase |
| `purchase.refunded` | Refund processed |

```
Webhook dispatch:
1. Event triggers in Stripe webhook handler
2. dispatchWebhooks() queries active webhooks matching event type
3. Sends signed HTTP POST (HMAC-SHA256 using webhook secret)
4. Failures are logged but don't block the main flow
```

Managed via `/api/admin/webhooks` (admin only).

---

## Multi-Offer System

Products table supports multiple offers:
- `slug` — URL-friendly identifier
- `category` — product grouping
- `sort_order` — display order on landing page

Landing page queries all active products and renders a PricingCard for each.
Purchase flow is already per-product (productId in checkout metadata).

---

## API Routes

| Route | Method | Purpose | Auth Required |
|---|---|---|---|
| `/api/checkout` | POST | Create Stripe Checkout session | Yes |
| `/api/webhooks/stripe` | POST | Handle Stripe webhook events | No (signature) |
| `/api/admin/refund` | POST | Process refund via Stripe | Admin only |
| `/api/admin/webhooks` | GET/POST/DELETE | Manage outbound webhooks | Admin only |
| `/api/admin/affiliates` | GET/POST/DELETE | Manage affiliates | Admin only |
| `/api/auth/callback` | GET | Handle email confirmation + welcome email | No (code exchange) |
| `/api/events` | POST | Track user events (funnel) | Optional |
| `/api/cron/daily` | GET | Daily metrics snapshot + onboarding emails | Cron secret |

---

## Security

- **RLS**: All Supabase tables have Row Level Security enabled
- **Middleware**: Auth + role checks on protected routes
- **Webhook verification**: Stripe signature validation
- **Outbound webhook signing**: HMAC-SHA256 signatures
- **Idempotency**: Duplicate webhook handling via session ID check
- **Cron authentication**: Bearer token verification via CRON_SECRET
- **Environment variables**: All keys stored in `.env.local` (gitignored)
- **Service role**: Only used server-side for webhook/cron processing

---

## Backup & Recovery

- **Automatic**: Supabase provides daily backups on paid plans
- **Manual**: Run `npx tsx scripts/backup.ts` to export all tables to JSON
- **Backup location**: `./backups/{timestamp}/`
- **Restore**: Import JSON data via Supabase dashboard or SQL INSERT statements

---

## Database Migrations

| File | Phase | Description |
|---|---|---|
| `001_initial_schema.sql` | 1-2 | Core tables (profiles, products, purchases, emails), RLS, triggers, seed data |
| `002_phase4_5_schema.sql` | 4-5 | Support role, multi-offer columns, events, daily_metrics, webhooks, affiliates, referrals |
