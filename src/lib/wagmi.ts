import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, polygonAmoy, hardhat } from "wagmi/chains";
import { cookieStorage, createStorage } from "wagmi";

export const config = getDefaultConfig({
  appName: "SaskPoly",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygonAmoy, polygon, hardhat],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
