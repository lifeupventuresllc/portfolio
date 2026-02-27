# Backend Flow Documentation

## Architecture Overview

**Stack**: Next.js 14 (App Router) + Supabase (Auth/DB) + Stripe (Payments)

### Data Model

```
auth.users (Supabase Auth)
  └── profiles (1:1) — id, email, role, created_at
        ├── purchases (1:many) — links user to product, tracks payment
        └── emails (1:many) — log of emails sent

products — id, name, description, price, stripe_price_id, active
```

### Roles

| Role     | Access                                      |
|----------|---------------------------------------------|
| free     | Landing page, locked content view            |
| customer | Landing page, unlocked content               |
| admin    | All of the above + admin dashboard           |

---

## Authentication Flow

```
1. User visits /signup
2. Fills out email + password form
3. Supabase Auth creates user in auth.users
4. Database trigger (handle_new_user) fires:
   - Creates profile in profiles table (role: 'free')
   - Logs signup email in emails table
5. User receives confirmation email (if enabled)
6. User visits /login → enters credentials
7. Supabase Auth issues session cookie
8. Middleware reads cookie on every request:
   - Protected routes (/content, /admin) → redirect to /login if no session
   - Admin routes → checks profile.role === 'admin'
   - Auth routes (/login, /signup) → redirect to / if already logged in
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
2. Client checks if user is logged in
   - Not logged in → redirect to /login?redirect=/content
   - Logged in → continue
3. Client POSTs to /api/checkout with { productId }
4. Server:
   a. Verifies user is authenticated
   b. Fetches product from database
   c. Checks for existing purchase (prevents double-purchase)
   d. Creates Stripe Checkout session with metadata (userId, productId)
   e. Returns checkout URL
5. Client redirects to Stripe Checkout
6. User completes payment (test card: 4242 4242 4242 4242)
7. Stripe sends webhook to /api/webhooks/stripe
8. Webhook handler:
   a. Verifies webhook signature
   b. Checks for idempotency (duplicate session ID)
   c. Inserts purchase record (status: 'completed')
   d. Updates profile role to 'customer'
   e. Logs purchase email
9. User is redirected to /content?success=true
10. Content page checks purchases table → shows unlocked content
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
```

---

## Admin Flow

```
1. Admin logs in (same auth flow)
2. Middleware checks profile.role === 'admin'
3. Admin dashboard loads:
   a. Fetches all profiles from Supabase
   b. Fetches all purchases (with joined profile email)
   c. Computes KPIs on-the-fly:
      - Total users, customers, free users
      - Total sales, revenue
      - Conversion rate (purchases / signups)
      - Refund rate (refunds / total purchases)
4. Admin can:
   - Search/filter users by email, role
   - Filter payments by status, date range
   - Change user roles (grant/revoke access)
   - Process refunds
```

---

## API Routes

| Route                      | Method | Purpose                          | Auth Required |
|----------------------------|--------|----------------------------------|---------------|
| `/api/checkout`            | POST   | Create Stripe Checkout session   | Yes           |
| `/api/webhooks/stripe`     | POST   | Handle Stripe webhook events     | No (signature) |
| `/api/admin/refund`        | POST   | Process refund via Stripe        | Admin only    |

---

## Security

- **RLS**: All Supabase tables have Row Level Security enabled
- **Middleware**: Auth + role checks on protected routes
- **Webhook verification**: Stripe signature validation
- **Idempotency**: Duplicate webhook handling via session ID check
- **Environment variables**: All keys stored in `.env.local` (gitignored)
- **Service role**: Only used server-side for webhook processing

---

## Backup & Recovery

- **Automatic**: Supabase provides daily backups on paid plans
- **Manual**: Run `npx tsx scripts/backup.ts` to export all tables to JSON
- **Backup location**: `./backups/{timestamp}/`
- **Restore**: Import JSON data via Supabase dashboard or SQL INSERT statements
