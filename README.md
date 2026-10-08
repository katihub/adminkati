# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

The server requires these runtime variables. Copy `.env.example` to `.env`, replace every placeholder,
and keep the file uncommitted: `NUXT_SESSION_PASSWORD` (at least 32 characters),
`NUXT_SUPABASE_URL`, `NUXT_SUPABASE_ANON_KEY`, and `NUXT_API_BASE_URL` (the backend origin without
`/v1`). Generate the session password with `openssl rand -hex 32`.

`NUXT_PUBLIC_STOREFRONT_URL` is the storefront origin (default `https://nowtech.newvcreatives.com`); the
product header links to `<origin>/produit/<slug>`. It is sent to the browser.

`NUXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY` is optional and enables brand-logo previews in the product
admin. Use a Logo.dev publishable (`pk_`) key only; this value is sent to the browser. Never put a
Logo.dev secret (`sk_`) key in the admin environment.

### AI product-copy configuration

Product-copy generation is server-only. Configure `NUXT_OPENAI_API_KEY` outside source control, then
verify the deployed model and both matching price values together before using audit cost figures:

- `NUXT_AI_PRODUCT_COPY_MODEL`
- `NUXT_AI_PRODUCT_COPY_INPUT_USD_PER_MILLION_TOKENS`
- `NUXT_AI_PRODUCT_COPY_OUTPUT_USD_PER_MILLION_TOKENS`

The quality-preserving baseline is `NUXT_AI_PRODUCT_COPY_REASONING_EFFORT=low`,
`NUXT_AI_PRODUCT_COPY_DEFAULT_IMAGE_PROFILE=all-auto`, and the output-token settings
`NUXT_AI_PRODUCT_COPY_MAX_OUTPUT_TOKENS`, `NUXT_AI_PRODUCT_COPY_NAME_MAX_OUTPUT_TOKENS`,
`NUXT_AI_PRODUCT_COPY_SHORT_DESCRIPTION_MAX_OUTPUT_TOKENS`,
`NUXT_AI_PRODUCT_COPY_LONG_DESCRIPTION_MAX_OUTPUT_TOKENS`, and
`NUXT_AI_PRODUCT_COPY_FEATURES_MAX_OUTPUT_TOKENS`. Keep the current baseline unless a blinded
non-production quality evaluation demonstrates non-inferior grounded copy with lower cost or latency.

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
