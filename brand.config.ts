export const brand = {
  name: "KatiMarket",
  adminName: "KatiMarket Admin",
  assistantName: "KatiMarket AI",
  wordmark: {
    leading: "KATI",
    accent: "MARKET",
  },
  logoPath: "/brand/katimarket-mark.png",
  storefrontUrl: "",
  /**
   * Where this brand's product photos are served from, allowed in the CSP's img-src even when
   * the build sees no environment. Production builds once ran without NUXT_SUPABASE_URL, and
   * every thumbnail in Products and Seller offers was blocked by the browser.
   */
  imageOrigins: ["https://supabase.katimarket.com", "https://api.katimarket.com"],
  colors: {
    navy: "#08265c",
    orange: "#ff7900",
  },
} as const
