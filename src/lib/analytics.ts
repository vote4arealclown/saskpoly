import { track } from "@vercel/analytics";

export function trackEvent(event: string, data?: Record<string, string | number | boolean>) {
  try {
    track(event, data);
  } catch {
    // silent fail — analytics should never break the app
  }
}
