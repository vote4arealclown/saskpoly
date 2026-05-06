import { createPublicClient, http, defineChain } from "viem";
import { polygon, mainnet } from "viem/chains";

export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  polygon: (process.env.USDC_POLYGON_ADDRESS as `0x${string}`) || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  ethereum: (process.env.USDC_ETHEREUM_ADDRESS as `0x${string}`) || "0xA0b86a33E6441e3CbeEee6bB7F2f1E3A3E1E3e3",
};

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS || "") as `0x${string}`;

const polygonRpc = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const ethereumRpc = process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com";

export function getPublicClient(chain: string) {
  const normalized = chain.toLowerCase();

  if (normalized === "polygon") {
    return createPublicClient({
      chain: polygon,
      transport: http(polygonRpc),
    });
  }

  if (normalized === "ethereum") {
    return createPublicClient({
      chain: mainnet,
      transport: http(ethereumRpc),
    });
  }

  return null;
}

export function getUsdcAddress(chain: string): `0x${string}` | null {
  return USDC_ADDRESSES[chain.toLowerCase()] || null;
}
