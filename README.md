# SaskPoly

Saskatchewan's first crypto prediction market. Bet on darts, local leagues, sports, weather, and politics using MetaMask or Phantom wallets.

## Features

- **Crypto Wallets**: Connect MetaMask, Phantom, or any WalletConnect-compatible wallet
- **Prediction Markets**: Create and bet on binary outcome markets
- **Self-Regulating Odds**: Prices adjust automatically based on pool sizes
- **Admin & Audit**: Role-based access for market resolution and oversight
- **Stripe Integration**: Ready for fiat on/off ramps
- **Vig Collection**: Platform takes a configurable fee on every bet

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma 7 + SQLite (easily swappable to PostgreSQL)
- NextAuth.js for staff login (Admin/Audit)
- RainbowKit + wagmi + viem for EVM wallet connection
- Hardhat for Solidity smart contract development
- Stripe for payments

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed sample markets
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Staff Login

- **Admin**: Use any email + password set in `ADMIN_PASSWORD`
- **Audit**: Use any email + password set in `AUDIT_PASSWORD`

## Smart Contract

A sample Solidity prediction market contract is included in `contracts/SaskPolyMarket.sol`.

```bash
npx hardhat compile
npx hardhat test
```

## Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

For production, switch from SQLite to PostgreSQL and update `DATABASE_URL`.

## License

MIT
