<script setup lang="ts">
import type { LoginInput } from "@/schemas/login"
import type { PublicSession } from "@/types/session"
import { ref } from "vue"
import { apiErrorText } from "@/utils/api-error"
import { resolveLoginRedirect } from "@/utils/redirect"

defineI18nRoute({
  paths: {
    en: "/login",
    fr: "/connexion",
  },
})

const { locale, t } = useI18n()

const year = useDayjs()().year()
const { supportEmail } = useRuntimeConfig().public

useSeoMeta({
  title: () => t("auth.login.seo.title"),
  description: () => t("auth.login.seo.description"),
  ogTitle: () => t("auth.login.seo.title"),
  ogDescription: () => t("auth.login.seo.description"),
  ogType: "website",
  robots: "noindex, nofollow",
})

useHead({
  titleTemplate: "%s",
})

const pending = ref(false)
const route = useRoute()
const formError = ref(route.query.reason === "deactivated" ? t("errors.deactivated") : "")
const { $csrfFetch, $queryClient } = useNuxtApp()

async function onSubmit(values: LoginInput) {
  pending.value = true
  formError.value = ""
  try {
    const session = await $csrfFetch<PublicSession>("/api/auth/login", { method: "POST", body: values })
    // The global auth middleware reads this exact cache key before it calls the
    // session endpoint. The login page may already have cached `null`; keeping
    // that stale value would redirect a freshly authenticated user straight
    // back to the login page even though the server cookie was created.
    $queryClient.setQueryData(["v1", "moi"], session)
    await navigateTo(resolveLoginRedirect(route.query.next, locale.value))
  } catch (error) {
    formError.value = apiErrorText(error, t)
  } finally {
    pending.value = false
  }
}

definePageMeta({ public: true })
</script>

<template>
  <div class="flex min-h-screen bg-primary/8 p-0 sm:p-4">
    <div class="grid w-full overflow-hidden rounded-none bg-card sm:rounded-3xl lg:grid-cols-[44fr_56fr]">
      <div class="flex flex-col p-6 sm:p-12">
        <header class="flex shrink-0 items-center justify-between gap-4">
          <BrandWordmark data-testid="brand-wordmark" />
          <LanguageSwitcher variant="ghost" />
        </header>

        <main class="flex flex-1 flex-col justify-center">
          <div class="mx-auto w-full max-w-lg py-12">
            <h1
              class="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              data-testid="login-heading"
            >
              {{ t("auth.login.heading") }}
            </h1>

            <p class="mx-auto mt-6 max-w-md text-center text-muted-foreground" data-testid="login-intro">
              {{ t("auth.login.intro") }}
            </p>

            <AuthLoginForm
              class="mt-10"
              data-testid="login-form"
              :pending="pending"
              :error="formError"
              @submit="onSubmit"
            />
          </div>
        </main>

        <footer class="shrink-0 text-center">
          <p class="text-sm font-semibold text-foreground" data-testid="login-support-prompt">
            {{ t("auth.login.support.prompt") }}
          </p>

          <a
            v-if="supportEmail"
            :href="`mailto:${supportEmail}`"
            class="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
            data-testid="login-support-link"
            >{{ supportEmail }}</a
          >

          <p class="mt-8 text-xs text-muted-foreground" data-testid="login-legal">
            {{ t("auth.login.legal", { year }) }}
          </p>
        </footer>
      </div>

      <AuthShowcasePanel data-testid="login-showcase" />
    </div>
  </div>
</template>
