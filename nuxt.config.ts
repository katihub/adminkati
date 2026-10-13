import { env } from "node:process"
import tailwindcss from "@tailwindcss/vite"

function parseOrigin(value: string): string | null {
  if (value.includes("${") || !URL.canParse(value)) return null
  return new URL(value).origin
}

function configuredOrigin(value: string | undefined): string | null {
  if (!value) return null
  return parseOrigin(value.includes("://") ? value : `https://${value}`)
}

const productImageOrigins = [
  ...new Set(
    [
      env.NUXT_API_BASE_URL,
      env.NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN,
      env.NUXT_SUPABASE_URL,
      env.BACKEND_URL,
      env.CATALOGUE_IMAGE_ORIGIN,
      env.SUPABASE_URL,
    ]
      .map(configuredOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  ),
]

// Deliberately narrower than `productImageOrigins` above (that one is CSP's img-src
// allowlist — broad on purpose). @nuxt/image's `domains` trusts a host for IPX
// transformation, and the only images that want it are banners: their artwork resolves
// through `stockage.urlPublique()` to the Supabase storage host specifically
// (`sql/vitrine.sql`, `stockage.service.ts:127-133` in NowTech-backend-).
//
// GOTCHA: this list cannot keep product images out of IPX, and nothing relies on it to.
// It used to: the catalogue host was simply not in it. But both halves are
// environment-derived and `configuredOrigin()` keeps only the origin, so once Supabase
// was served behind the API's own domain (`https://nowtech-api.newvcreatives.com/supabase`)
// the banner host and the catalogue host became the same host, and every product image
// would silently have gone through this server's IPX. What keeps them out now is
// structural: product images render through `products/Picture.vue`, which pins
// `provider="none"`, so their URL is left as the backend sent it whatever this list
// holds. `.env.test` names the same host on both sides on purpose, so the suite proves it.
const bannerImageOrigins = [
  ...new Set(
    [env.NUXT_SUPABASE_URL, env.SUPABASE_URL]
      .map(configuredOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  ),
]

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@vercel/analytics",
    "@vueuse/nuxt",
    "dayjs-nuxt",
    "evlog",
    "nuxt-freeform",
    "nuxt-headlessui",
    "nuxt-lottie",
    "nuxt-security",
    "nuxt-seo-utils",
    // "nuxt-spyglass",
    "nuxt-ssr-api-logger",
    "nuxt-zod",
    "nuxt-zod-i18n",
    "nuxt-charts",
    "@nuxtjs/i18n",
  ],
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  // The host alone no longer decides who gets IPX — banners and product images share
  // it. Banner artwork uses the default provider, which transforms an absolute URL
  // whose host is trusted in `domains`, so it is resized (several MB over a slow origin,
  // cropped into a thumbnail). Product images go through `products/Picture.vue` with
  // `provider="none"` and are served as the catalogue backend sends them, although
  // their host is in that same list — `products-image-rendering.test.ts` guards that.
  // GOTCHA: `none` must be declared below. @nuxt/image registers only the providers
  // named in this block (plus the default), and rendering with an unregistered one
  // throws "Unknown provider: none".
  image: {
    domains: bannerImageOrigins,
    none: {},
  },
  runtimeConfig: {
    sessionPassword: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    apiBaseUrl: "",
    // Server-only. Same value as the backend's REVALIDATION_SECRET: it lets the backend's rate
    // limiter recognise this server instead of throttling every operator as one address. Never
    // move it under `public` — anyone holding it could bypass the backend's rate limits.
    // Override with NUXT_BACKEND_SHARED_SECRET.
    backendSharedSecret: "",
    localAuthBypass: true,
    // Server-only, like every key below: none of them may move under `public`. Overridden by
    // NUXT_OPENAI_API_KEY and the NUXT_AI_PRODUCT_COPY_* variables (see `assertAiConfig`).
    openaiApiKey: "",
    aiProductCopyModel: "gpt-5-mini",
    aiProductCopyQuotaPerHour: 50,
    aiProductCopyTimeoutMs: 60_000,
    // Free text allowed into one prompt, counted in characters across every draft field.
    aiProductCopyPromptCharLimit: 30_000,
    // GPT-5 mini bills its hidden reasoning against this ceiling too, so it is well above the visible package.
    aiProductCopyMaxOutputTokens: 12_000,
    // Baseline policy stays quality-preserving until a blinded non-production comparison approves a leaner value.
    aiProductCopyReasoningEffort: "low",
    aiProductCopyDefaultImageProfile: "all-auto",
    aiProductCopyNameMaxOutputTokens: 12_000,
    aiProductCopyShortDescriptionMaxOutputTokens: 12_000,
    aiProductCopyLongDescriptionMaxOutputTokens: 12_000,
    aiProductCopyFeaturesMaxOutputTokens: 12_000,
    aiProductCopyInputUsdPerMillionTokens: 0.25,
    aiProductCopyOutputUsdPerMillionTokens: 2,
    public: {
      catalogueImageOrigin: "",
      // Origin of the public storefront, without a trailing path. Override with NUXT_PUBLIC_STOREFRONT_URL.
      storefrontUrl: "https://nowtech.newvcreatives.com",
      // Publishable Logo.dev key; intentionally browser-visible and restricted to img.logo.dev.
      logoDevPublishableKey: "",
      // TODO: unset until the real NowTech support address is confirmed. The
      // login page renders its mailto: link only when this is non-empty, so
      // nothing fake ships. Override with NUXT_PUBLIC_SUPPORT_EMAIL.
      supportEmail: "",
    },
  },
  typescript: {
    tsConfig: {
      // GOTCHA: Nuxt puts test/nuxt/** in tsconfig.app.json but not test/unit/**,
      // so unit specs were invisible to `nuxt typecheck` while an editor still
      // reported their errors. Merged, not replaced — defu concatenates include.
      include: ["../test/unit/**/*"],
    },
  },
  compatibilityDate: "2025-07-15",
  components: [
    {
      path: "~/components",
      extensions: [".vue"],
    },
  ],
  vite: {
    plugins: [
      tailwindcss(),
      /**
       * DAYJS EN ESM, SINON RIEN N'HYDRATE.
       *
       * `dayjs` déclare `main: dayjs.min.js` (UMD) et ni `module` ni
       * `exports`. Vite le sert donc tel quel, et l'import ESM de
       * `dayjs-nuxt` n'y trouve aucun `default` : le navigateur lève
       * « does not provide an export named 'default' » AU CHARGEMENT du
       * bundle, donc avant toute hydratation.
       *
       * LE SYMPTÔME NE RESSEMBLE PAS À SA CAUSE, et c'est ce qui coûte cher :
       * la page s'affiche normalement — elle est rendue côté serveur — et
       * seul le JavaScript est mort. Le formulaire de connexion repartait en
       * soumission HTML native vers `/login?`, sans jamais appeler l'API.
       * Impossible d'entrer dans le panel en développement, sans un seul
       * message d'erreur visible.
       *
       * UN PLUGIN PLUTÔT QU'UN ALIAS, pour deux raisons. Un alias d'objet
       * fait de la correspondance par PRÉFIXE : « dayjs » → « dayjs/esm/… »
       * se re-matche lui-même à l'infini (résolution en boucle, Node meurt
       * en OOM — essayé), et il emporterait aussi `dayjs/plugin/utc` vers un
       * chemin inexistant. Ici la correspondance est exacte, et les plugins
       * et locales — UMD eux aussi — sont redirigés vers leur propre ESM.
       */
      {
        name: "nowtech:dayjs-esm",
        enforce: "pre" as const,
        resolveId(id: string) {
          if (id === "dayjs") return this.resolve("dayjs/esm/index.js", undefined, { skipSelf: true })
          const sousModule = /^dayjs\/((?:plugin|locale)\/.+)$/.exec(id)
          if (sousModule) return this.resolve(`dayjs/esm/${sousModule[1]}`, undefined, { skipSelf: true })
          return null
        },
      },
    ],
  },
  fonts: {
    families: [
      { name: "Manrope", provider: "google", weights: ["400 800"] },
      { name: "IBM Plex Mono", provider: "google", weights: ["400 700"] },
    ],
  },
  site: {
    name: "NowTech Admin",
  },
  seo: {
    automaticOgAndTwitterTags: false,
  },
  i18n: {
    defaultLocale: "en",
    strategy: "prefix_except_default",
    langDir: "locales",
    locales: [
      {
        code: "en",
        language: "en-US",
        name: "English",
        files: [
          "assistant/en.json",
          "auth/en.json",
          "caisse/en.json",
          "common/en.json",
          "content/en.json",
          "errors/en.json",
          "orders/en.json",
          "operations/en.json",
          "points-of-sale/en.json",
          "products/en.json",
          "stats/en.json",
          "taxonomy/en.json",
          "team/en.json",
          "users/en.json",
          "validation/en.json",
        ],
      },
      {
        code: "fr",
        language: "fr-FR",
        name: "Francais",
        files: [
          "assistant/fr.json",
          "auth/fr.json",
          "caisse/fr.json",
          "common/fr.json",
          "content/fr.json",
          "errors/fr.json",
          "orders/fr.json",
          "operations/fr.json",
          "points-of-sale/fr.json",
          "products/fr.json",
          "stats/fr.json",
          "taxonomy/fr.json",
          "team/fr.json",
          "users/fr.json",
          "validation/fr.json",
        ],
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "NT-LANG",
      fallbackLocale: "en",
      redirectOn: "root",
    },
  },
  nuxtZod: {
    zodVersion: "v4",
  },
  security: {
    headers: {
      contentSecurityPolicy: {
        // `blob:` sert les APERÇUS LOCAUX, jamais une image distante : en
        // création, une image choisie sur la machine s'affiche par une URL
        // d'objet avant même que le produit existe. Sans cette entrée, le
        // panneau montre une vignette vide et l'opérateur ne sait pas si son
        // fichier a été pris.
        "img-src": ["'self'", "data:", "blob:", "https://img.logo.dev", ...productImageOrigins],
      },
    },
    csrf: { methodsToProtect: ["POST", "PUT", "PATCH", "DELETE"], addCsrfTokenToEventCtx: true },
    xssValidator: { methods: ["GET", "POST"], throwError: true },
  },
  routeRules: {
    // REVERTED: `cache: { maxAge: ... }` on this route made Nitro's
    // `cachedEventHandler` wrap `@nuxt/image`'s ipx handler (a raw Node
    // middleware via `fromNodeMiddleware`, not a normal H3 response) — a
    // transient 500 from ipx got cached and replayed to every viewer for the
    // configured maxAge, and something about replaying that cached entry left
    // the response perpetually "pending" client-side (worse than the
    // uncached slow-origin wait this was meant to fix). ipx (4.0.0-beta.1)
    // still has no cross-request cache of its own — see the walkthrough
    // addendum for the real fix, once one exists that doesn't wrap this
    // specific handler in Nitro's generic response cache.
    "/api/auth/session": { csurf: false },
    "/api/**": { security: { xssValidator: false } },
    // The coarse transport net around the AI endpoints; the per-operator hourly allowance lives in the handler.
    // CSRF is inherited from the global `csrf` block on purpose: a POST here spends money, so it needs the token.
    // The ceiling covers the largest draft the schema admits (about 33 000 characters of UTF-8 text).
    "/api/ai/**": {
      security: {
        rateLimiter: { tokensPerInterval: 120, interval: 300000 },
        requestSizeLimiter: { maxRequestSizeInBytes: 262_144, maxUploadFileRequestInBytes: 262_144 },
      },
    },
    "/api/v1/**": {
      security: {
        rateLimiter: { tokensPerInterval: 600, interval: 300000 },
        // maxUploadFileRequestInBytes governs multipart/form-data (banner
        // artwork uploads), maxRequestSizeInBytes governs everything else.
        // The check is `>=` and reads `content-length`, so both ceilings sit
        // one byte above the BFF's own caps in server/api/v1/[...path].ts.
        //
        // THE OUTER NET IS COARSE ON PURPOSE, AND THE BFF IS THE REAL GUARD.
        // This module cannot tell a 25 MB datasheet from a 25 MB JSON body:
        // it reads content-length and nothing else. Raising it to the largest
        // legitimate payload (a PDF) and keeping the type-aware ceilings in
        // the BFF — 5 MB raw/JSON, 25 MiB only for application/pdf — is the
        // only arrangement where a real datasheet passes and an oversized
        // JSON body still does not.
        requestSizeLimiter: { maxRequestSizeInBytes: 26_214_401, maxUploadFileRequestInBytes: 16_000_001 },
      },
    },
  },
})
