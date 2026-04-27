# ClubOS — Project Context for Claude Code

## What is ClubOS?

ClubOS is a multi-tenant SaaS platform that lets gym and sports club owners manage their club, members, events, and payments. It's built for any sport (wrestling, BJJ, gymnastics, etc.).

**Two sides:**
1. **Club owner dashboard** — manage members, events, memberships, payments, staff, documents, messaging
2. **Member-facing app** — book classes, track progress, pay, communicate with coaches

**Key architecture principle:** Every club is a tenant. All data is scoped by `clubId`. One database, many clubs.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2.35 (App Router) |
| Auth | NextAuth v4 (credentials provider, JWT sessions) |
| Database | PostgreSQL via Prisma ORM |
| Payments | Stripe (Connect for club payouts, subscriptions for member billing) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Hosting (future) | Vercel (web) + managed Postgres |

**Important version pins** (do NOT upgrade):
- `next`: `14.2.35` (not 15 or 16)
- `next-auth`: `^4.24.7` (not v3)
- `prisma` + `@prisma/client`: `5.7.0` (must match exactly)
- `stripe`: `^14.21.0`

---

## Project Structure

```
clubos/
└── web/                          ← Next.js app (everything lives here)
    ├── app/
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── [...nextauth]/route.ts   ← NextAuth handler
    │   │   │   ├── signup/route.ts          ← Create account or join club
    │   │   │   ├── forgot-password/route.ts
    │   │   │   └── reset-password/route.ts
    │   │   ├── club/
    │   │   │   └── update/route.ts          ← Owner updates club info
    │   │   ├── members/
    │   │   │   ├── route.ts                 ← List + create members
    │   │   │   ├── [id]/route.ts            ← Get/update/delete member
    │   │   │   └── subscribe/route.ts       ← Stripe Checkout for membership
    │   │   ├── memberships/
    │   │   │   ├── route.ts
    │   │   │   └── [id]/route.ts
    │   │   ├── events/
    │   │   │   ├── route.ts
    │   │   │   └── [id]/
    │   │   │       ├── route.ts
    │   │   │       ├── bookings/route.ts    ← Book/cancel members on events
    │   │   │       └── charge/route.ts      ← Stripe Checkout for event
    │   │   ├── custom-fields/
    │   │   │   ├── route.ts                 ← Club-defined member fields
    │   │   │   └── [id]/route.ts
    │   │   ├── transactions/
    │   │   │   └── route.ts                 ← Financial log
    │   │   └── stripe/
    │   │       ├── connect/route.ts         ← Start Stripe Connect onboarding
    │   │       ├── status/route.ts          ← Check Stripe account status
    │   │       ├── dashboard/route.ts       ← Link to Stripe Express dashboard
    │   │       └── webhook/route.ts         ← Stripe webhook listener
    │   ├── dashboard/
    │   │   ├── layout.tsx                   ← Sidebar nav (wraps all dashboard pages)
    │   │   ├── page.tsx                     ← Dashboard overview/home
    │   │   ├── members/page.tsx
    │   │   ├── events/page.tsx
    │   │   ├── memberships/page.tsx
    │   │   ├── financials/page.tsx
    │   │   └── settings/
    │   │       ├── billing/page.tsx         ← Stripe Connect setup
    │   │       └── custom-fields/page.tsx   ← Member signup field builder
    │   ├── login/page.tsx
    │   ├── signup/page.tsx                  ← Create club OR join club toggle
    │   ├── onboarding/page.tsx              ← 4-step wizard after first signup
    │   ├── forgot-password/page.tsx
    │   ├── providers.tsx                    ← SessionProvider wrapper
    │   └── layout.tsx                       ← Root layout (wraps providers)
    ├── components/
    │   └── StripeRequiredBanner.tsx         ← Yellow banner shown until Stripe connected
    ├── lib/
    │   ├── auth.ts                          ← NextAuth config + authorize logic
    │   ├── prisma.ts                        ← Prisma client singleton
    │   └── stripe.ts                        ← Stripe SDK + fee helpers
    ├── prisma/
    │   └── schema.prisma                    ← Database schema
    ├── types/
    │   └── next-auth.d.ts                   ← Extended session types
    ├── middleware.ts                         ← Route protection by role
    ├── .env                                 ← Environment variables (not .env.local)
    └── package.json
```

---

## Environment Variables (.env)

```
DATABASE_URL="postgresql://user@localhost:5432/clubos"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   ← from Stripe CLI during local dev
```

**Important:** Prisma only reads `.env`, NOT `.env.local`. Make sure it's named `.env`.

---

## Database Schema (Key Models)

```prisma
Club {
  id, name, slug (unique), tier, tagline, sport, primaryColor, logoUrl
  stripeAccountId, stripeOnboardingComplete, stripeChargesEnabled, stripePayoutsEnabled
  stripeCustomerId, stripeSubscriptionId, subscriptionStatus
}

User {
  id, clubId, email, passwordHash, firstName, lastName
  role: "OWNER" | "STAFF" | "MEMBER"
  resetToken, resetExpires, lastLoginAt
  @@unique([clubId, email])
}

Member {
  id, clubId, userId?, firstName, lastName, dateOfBirth?
  status: "ACTIVE" | "PROSPECT" | "INACTIVE" | "PAUSED"
  membershipId?, tags (String, comma-separated), notes?
  customFieldValues (JSON string: { fieldId: value })
  stripeCustomerId?
}

Membership {
  id, clubId, name, description?, active
  options (JSON string: [{ label, price, billingPeriod }])
  billingPeriod values: WEEKLY | MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL | ONE_TIME
}

MemberSubscription {
  id, memberId, membershipId, optionLabel
  stripeSubscriptionId?, stripePriceId?
  status: "pending" | "active" | "past_due" | "canceled"
  startedAt?, canceledAt?
}

Event {
  id, clubId, locationId?, type, name, description?
  startsAt, endsAt, capacity?
  memberPrice?, nonMemberPrice?, dropInFee?, travelFee?
  publishAt?, unpublishAt?
}

Booking {
  id, eventId, memberId
  status: "CONFIRMED" | "WAITLISTED" | "CANCELED" | "ATTENDED" | "NO_SHOW"
  @@unique([eventId, memberId])
}

CustomField {
  id, clubId, label
  fieldType: "text" | "email" | "phone" | "address" | "date" | "textarea" | "number" | "select"
  required, options (JSON string), sortOrder, active
}

Transaction {
  id, clubId, memberId?, amount, platformFee?
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED"
  stripePaymentIntentId?
}
```

**SQLite note:** Schema uses `String` (not `String[]`) for array-like fields. `tags`, `channels`, `options`, `permissions` are all stored as JSON strings or comma-separated strings.

---

## Pricing Tiers

| Tier | Price | Transaction Fee | Key Features |
|------|-------|----------------|--------------|
| Starter | $0/mo | 2.5% | 150 member cap, 1 location, basic messaging |
| Growth | $49/mo | 1.25% | Unlimited members, reports, direct messaging |
| Pro | $99/mo + $50 setup | 0% | Branded iOS + Android app, full analytics |
| Enterprise | $199/mo + $50 setup | 0% | Multi-location, API, custom onboarding |

Platform fee is taken via Stripe Connect `application_fee_amount` or `application_fee_percent`.

---

## Auth Flow

1. User visits `/signup` → toggle: "Create a club" or "Join a club"
2. **Create a club:** API creates a temp club record → creates user as OWNER → redirects to `/onboarding`
3. **Join a club:** User provides club slug → creates user as MEMBER → redirects to `/dashboard`
4. Onboarding wizard (4 steps): club name → URL/slug → branding → review/launch → updates club record
5. Login: `POST /api/auth/callback/credentials` with `{ email, password, clubSlug }`
6. Session JWT contains: `{ id, email, name, role, clubId }`
7. `middleware.ts` protects `/dashboard/**`, `/admin/**`, `/member/**`

---

## Stripe Architecture

**Two separate Stripe integrations:**

1. **Stripe Connect (club → members):**
   - Each club connects their own Stripe Express account
   - Members pay via Stripe Checkout → money goes to club's Stripe account
   - ClubOS takes platform fee via `application_fee_amount`
   - Connect flow: `/api/stripe/connect` → Stripe onboarding → return to `/dashboard/settings/billing`

2. **ClubOS subscription (club pays us):**
   - Clubs pay us for the platform via Stripe subscription
   - Not yet fully implemented — fields exist on Club model

**Webhook events handled:**
- `account.updated` → sync Connect account status
- `checkout.session.completed` → record transaction, activate subscription
- `invoice.paid` → record renewal transaction
- `invoice.payment_failed` → mark subscription past_due
- `customer.subscription.deleted` → mark subscription canceled

**Local dev webhooks:** Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --forward-connect-to localhost:3000/api/stripe/webhook
```

---

## Common Issues & Fixes

### "Module not found: Can't resolve 'stripe'"
Run `npm install` in `clubos/web/`, then restart dev server.

### Prisma WASM error / version mismatch
```bash
rm -rf node_modules
npm install
npx prisma generate
```
Make sure `prisma` and `@prisma/client` are both `5.7.0` in `package.json`.

### "Cannot find DATABASE_URL"
Prisma reads `.env`, not `.env.local`. Rename if needed.

### Next.js running v16 instead of v14
Check `package.json` — `next` must be pinned to `"14.2.35"` (no `^`).
Also delete any `package-lock.json` or `package.json` in the parent `clubos/` folder.

### Session lost after dev server restart
Normal in development. Just log back in. Sessions persist in production.

### Data wiped after `prisma db push`
`db push` and `migrate reset` both wipe data. Avoid running these unless schema changed. Use `prisma generate` when only code needs regenerating.

### 401 on API routes
The session `clubId` must match the resource's `clubId`. After wiping data, sign up again — the old JWT references a deleted club.

---

## What's Built

- [x] Authentication (signup, login, forgot/reset password)
- [x] Multi-tenant club creation and onboarding wizard
- [x] Dashboard layout with sidebar navigation
- [x] Members management (list, add, edit, soft-delete, tags, custom fields, status)
- [x] Custom field builder (text, email, phone, address, date, textarea, number, dropdown)
- [x] Memberships management (name, description, purchase options with billingPeriod)
- [x] Events management (types, pricing tiers, capacity, publish/unpublish dates, travel fee)
- [x] Bookings (add/remove members, auto-waitlist, auto-promote from waitlist)
- [x] Stripe Connect onboarding + status page
- [x] Stripe webhook listener
- [x] Member subscription via Stripe Checkout
- [x] Event charge via Stripe Checkout (member/non-member/drop-in pricing)
- [x] Transactions/financials page
- [x] StripeRequiredBanner component (shown on Members + Events until connected)
- [x] Role-based middleware (OWNER / STAFF / MEMBER)

## What's NOT Built Yet

- [ ] Messaging / announcements (dashboard section is placeholder)
- [ ] Calendar view
- [ ] Attendance tracking
- [ ] Staff management page
- [ ] Documents / forms builder
- [ ] Member portal (member-facing web UI)
- [ ] Branded app studio (iOS/Android app builder — Elite tier feature)
- [ ] Marketing landing page (clubos.app homepage, pricing page)
- [ ] Email sending (forgot password sends token but no actual email)
- [ ] Push notifications
- [ ] Multi-location dashboard (Enterprise tier)
- [ ] ClubOS platform subscription billing (clubs paying us)

---

## Design System

- **Font:** Inter (system), Fraunces (display/headings in marketing)
- **Colors:** Stone palette from Tailwind (`stone-900` primary, `stone-50` backgrounds)
- **Accent:** `#534AB7` (purple — ClubOS brand)
- **Border radius:** `rounded-lg` (8px) for inputs, `rounded-xl` (12px) for cards
- **Style:** Clean, minimal, professional — not playful
- **Component pattern:** Inline modals (fixed overlay) for create/edit forms

---

## Running Locally

```bash
cd /Users/cubano/Desktop/clubos/web

# Install deps
npm install

# Generate Prisma client
npx prisma generate

# Push schema to DB (only if schema changed — wipes data!)
npx prisma db push

# Start dev server
npm run dev

# Open DB browser
npx prisma studio

# Forward Stripe webhooks (separate terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --forward-connect-to localhost:3000/api/stripe/webhook
```

**App runs at:** http://localhost:3000
**Prisma Studio:** http://localhost:5555

---

## Owner Info

- **Mac username:** cubano
- **Project path:** `/Users/cubano/Desktop/clubos/web`
- **GitHub repo:** ClubOS (created and pushed)
- **Stripe:** Test mode, Connect enabled, test connected account created
- **Database:** PostgreSQL (local), database name `clubos`
