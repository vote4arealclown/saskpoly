import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, mainnet } from "wagmi/chains";
import { cookieStorage, createStorage } from "wagmi";

export const config = getDefaultConfig({
  appName: "SaskPoly",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "saskpoly-wallet-default",
  chains: [polygon, mainnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
