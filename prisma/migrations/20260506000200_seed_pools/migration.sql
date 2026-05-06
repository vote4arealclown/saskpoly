-- Seed all existing markets with $10 each side so they have starting liquidity
UPDATE "Market" SET "yesPool" = 10, "noPool" = 10 WHERE "yesPool" = 0 AND "noPool" = 0;
