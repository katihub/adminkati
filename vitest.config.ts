import { fileURLToPath } from "node:url"
import { defineVitestProject } from "@nuxt/test-utils/config"
import { defineConfig } from "vitest/config"

// `.env.test` does not override variables inherited from the shell. Set the
// inputs that affect Nuxt Image before the Nuxt project evaluates nuxt.config.ts.
for (const [key, value] of Object.entries({
  BACKEND_URL: undefined,
  CATALOGUE_IMAGE_ORIGIN: undefined,
  NUXT_API_BASE_URL: undefined,
  NUXT_IMAGE_PROVIDER: "ipx",
  NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN: "https://api.test",
  NUXT_SUPABASE_URL: undefined,
  SUPABASE_URL: "https://api.test/supabase",
  VERCEL: undefined,
})) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/*.{test,spec}.ts"],
          environment: "node",
          hookTimeout: 30_000,
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/*.{test,spec}.ts"],
          setupFiles: ["./test/setup/local-storage.ts"],
          environment: "nuxt",
          hookTimeout: 30_000,
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL(".", import.meta.url)),
              domEnvironment: "happy-dom",
            },
          },
        },
      }),
    ],
    coverage: {
      enabled: true,
      provider: "v8",
    },
  },
})
