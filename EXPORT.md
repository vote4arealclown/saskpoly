# SaskPoly — Vercel Deployment Export

This document contains everything needed to continue this project in a new session and deploy it to **Vercel**.

---

## Project Overview

SaskPoly is a prediction market app where users can:
- Create an account (email + password)
- Browse and create prediction markets (Yes/No outcomes)
- Place bets using Stripe card payments
- View a personal dashboard with analytics (Chart.js)
- Admin/Audit roles can resolve markets

**Current stack:** Next.js 16 + TypeScript + Tailwind CSS + Prisma 7 + SQLite + NextAuth.js + Stripe

**Target platform:** Vercel (requires switching from SQLite to PostgreSQL)

---

## Repo Structure

```
├── prisma/
│   ├── schema.prisma          (User, Market, Bet, Resolution, StripePayment models)
│   └── seed.ts                (seed sample markets)
├── src/
│   ├── app/
│   │   ├── page.tsx           (homepage)
│   │   ├── layout.tsx         (root layout, no rainbowkit styles)
│   │   ├── globals.css
│   │   ├── create/page.tsx    (create market form)
│   │   ├── markets/page.tsx   (markets list)
│   │   ├── markets/[id]/page.tsx   (market detail + Stripe checkout)
│   │   ├── dashboard/page.tsx      (USER DASHBOARD — needs to be built)
│   │   ├── admin/page.tsx     (admin dashboard)
│   │   ├── audit/page.tsx     (audit dashboard)
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   (NextAuth: user-login + staff-login providers)
│   │       ├── auth/register/route.ts        (user registration with bcrypt)
│   │       ├── markets/route.ts
│   │       ├── markets/[id]/route.ts
│   │       ├── markets/[id]/resolve/route.ts
│   │       ├── bets/route.ts                 (verifies Stripe PI before creating bet)
│   │       ├── stripe/route.ts               (creates PaymentIntent with metadata)
│   │       └── admin/users/route.ts
│   ├── components/
│   │   ├── navbar.tsx         (Sign In / Sign Up modal, no wallet code)
│   │   ├── providers.tsx      (SessionProvider only, no wagmi/rainbowkit)
│   │   └── stripe-checkout.tsx (Stripe Elements card form)
│   └── lib/
│       ├── auth.ts            (NextAuth options: user + staff credentials)
│       ├── prisma.ts
│       └── stripe.ts
├── contracts/                  (Solidity contract — optional, not used by app)
├── .env / .env.example
├── package.json
├── next.config.ts
└── tsconfig.json
```

**Critical missing piece:** There is NO `/dashboard` page yet in the Next.js app. The Flask version has one with Chart.js analytics — the Next.js version needs this built.

---

## Key Files Content (Copy-Paste Ready)

### 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"   // TODO: change to "postgresql" for Vercel
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  role          Role      @default(USER)
  password      String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  markets       Market[]
  bets          Bet[]
  resolutions   Resolution[]
  stripePayments StripePayment[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Market {
  id          String        @id @default(cuid())
  title       String
  description String
  category    String
  imageUrl    String?
  creatorId   String
  yesPool     Float         @default(0)
  noPool      Float         @default(0)
  totalVolume Float         @default(0)
  status      MarketStatus  @default(OPEN)
  resolution  Boolean?
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())
  closesAt    DateTime?
  vigPercent  Float         @default(2.5)
  creator     User          @relation(fields: [creatorId], references: [id])
  bets        Bet[]
  resolutions Resolution[]
  stripePayments StripePayment[]
}

model Bet {
  id        String    @id @default(cuid())
  userId    String
  marketId  String
  amount    Float
  outcome   Boolean
  shares    Float
  status    BetStatus @default(ACTIVE)
  createdAt DateTime  @default(now())
  claimedAt DateTime?
  user   User   @relation(fields: [userId], references: [id])
  market Market @relation(fields: [marketId], references: [id])
}

model Resolution {
  id          String   @id @default(cuid())
  marketId    String
  resolverId  String
  outcome     Boolean
  evidenceUrl String?
  createdAt   DateTime @default(now())
  market   Market @relation(fields: [marketId], references: [id])
  resolver User   @relation(fields: [resolverId], references: [id])
}

model StripePayment {
  id              String   @id @default(cuid())
  paymentIntentId String   @unique
  amount          Float
  status          String   @default("pending")
  userId          String
  marketId        String
  outcome         Boolean
  createdAt       DateTime @default(now())
  user   User   @relation(fields: [userId], references: [id])
  market Market @relation(fields: [marketId], references: [id])
}

enum Role {
  USER
  ADMIN
  AUDIT
}

enum MarketStatus {
  OPEN
  CLOSED
  RESOLVED
  CANCELLED
}

enum BetStatus {
  ACTIVE
  WON
  LOST
  CANCELLED
}
```

### 2. NextAuth Config (`src/lib/auth.ts`)

Uses two CredentialsProviders: `user-login` (bcrypt) and `staff-login` (env password).

### 3. Stripe API (`src/app/api/stripe/route.ts`)

Creates PaymentIntent with metadata (`marketId`, `outcome`, `userId`) and stores a pending `StripePayment` record.

### 4. Bets API (`src/app/api/bets/route.ts`)

Verifies the PaymentIntent is `succeeded` via Stripe API, checks metadata matches, then creates the `Bet` and updates the `Market` pools.

### 5. Market Detail Page (`src/app/markets/[id]/page.tsx`)

- Shows Yes/No odds bar
- If logged in: select outcome → enter amount → "Continue to Payment" → shows `<StripeCheckout>` card form → pays → places bet
- If admin/audit: shows Resolve Yes/No buttons

### 6. Navbar (`src/components/navbar.tsx`)

- Sign In / Sign Up modal (inline, no redirect)
- Switch between user sign-in, user sign-up, and staff login
- Shows user name + sign out when authenticated
- Links to Dashboard, Admin, Audit

---

## Environment Variables (Vercel)

| Variable | Value | Secret? |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Random 32+ char string | Yes |
| `NEXTAUTH_URL` | `https://yourdomain.vercel.app` | No |
| `ADMIN_PASSWORD` | Your admin password | Yes |
| `AUDIT_PASSWORD` | Your audit password | Yes |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | No |

---

## Pre-Deployment Checklist

1. **Switch DB to PostgreSQL**
   - Change `prisma/schema.prisma` datasource to `provider = "postgresql"`
   - Use Vercel Postgres, Neon, or Supabase
   - Run `npx prisma migrate dev`

2. **Remove SQLite-specific packages** (optional but clean)
   - `better-sqlite3`, `@prisma/adapter-better-sqlite3` can be removed
   - Update `prisma.config.ts` if it references SQLite

3. **Add Dashboard page**
   - Build `/dashboard` with user bet history + Chart.js analytics
   - Add API route `/api/dashboard` returning aggregated stats

4. **Stripe Webhook (optional for production)**
   - Currently verifies payment client-side then server-side
   - For production robustness, add a Stripe webhook endpoint

5. **Build & Test**
   - `npm run build` must pass
   - `npm run seed` to populate sample markets

---

## Deployment Steps (Vercel)

1. Push repo to GitHub
2. Import into Vercel dashboard
3. Add all env vars in Vercel Project Settings
4. Set build command: `npm run build` (default)
5. Deploy

---

## Known Issues / TODO

- **No `/dashboard` page exists in the Next.js app.** The Flask version has one with Chart.js — this needs to be ported/rebuilt in React.
- **No password reset flow.**
- **No Stripe webhook handling** — relies on client-side confirmation + server-side PI retrieval.
- **Smart contract code** in `contracts/` is unused by the web app (was for crypto wallets, now removed).

---

## How to Use This Export

Copy-paste this entire document into your new prompt and say:

> "Deploy this Next.js prediction market app to Vercel. Switch from SQLite to PostgreSQL, add the missing /dashboard page with Chart.js analytics, and ensure Stripe payments work end-to-end."
