import { getPublicClient, getUsdcAddress, TREASURY_ADDRESS } from "./chains";
import { erc20Abi } from "viem";

export interface VerifiedDeposit {
  valid: boolean;
  error?: string;
  actualAmount?: number;
  fromAddress?: string;
  toAddress?: string;
}

export async function verifyDepositOnChain(
  txHash: string,
  chain: string,
  expectedAmount: number,
  expectedFrom: string
): Promise<VerifiedDeposit> {
  if (!TREASURY_ADDRESS || TREASURY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { valid: false, error: "Treasury wallet not configured" };
  }

  const client = getPublicClient(chain);
  if (!client) {
    return { valid: false, error: "Unsupported chain" };
  }

  const usdcAddress = getUsdcAddress(chain);
  if (!usdcAddress) {
    return { valid: false, error: "USDC address not configured for this chain" };
  }

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt || receipt.status !== "success") {
      return { valid: false, error: "Transaction not found or failed" };
    }

    // Parse logs for ERC-20 Transfer events to the treasury address
    for (const log of receipt.logs) {
      // Must be from the USDC contract
      if (log.address.toLowerCase() !== usdcAddress.toLowerCase()) continue;

      // Must have 3 topics (Transfer event signature + indexed from + indexed to)
      if (log.topics.length !== 3) continue;

      const eventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      if (log.topics[0].toLowerCase() !== eventSignature.toLowerCase()) continue;

      const from = ("0x" + log.topics[1].slice(-40)) as `0x${string}`;
      const to = ("0x" + log.topics[2].slice(-40)) as `0x${string}`;
      const value = BigInt(log.data);

      // Check it's a transfer TO the treasury
      if (to.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) continue;

      // Check it's from the claimed sender
      if (from.toLowerCase() !== expectedFrom.toLowerCase()) continue;

      // USDC has 6 decimals
      const decimals = 6;
      const actualAmount = Number(value) / 10 ** decimals;

      // Allow 1% tolerance for rounding
      const tolerance = expectedAmount * 0.01;
      if (Math.abs(actualAmount - expectedAmount) > tolerance) {
        return {
          valid: false,
          error: `Amount mismatch. Expected ~$${expectedAmount}, found $${actualAmount.toFixed(2)}`,
          actualAmount,
          fromAddress: from,
          toAddress: to,
        };
      }

      return {
        valid: true,
        actualAmount,
        fromAddress: from,
        toAddress: to,
      };
    }

    return { valid: false, error: "No USDC transfer to treasury found in this transaction" };
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to verify transaction on-chain" };
  }
}
