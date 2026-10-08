<script setup lang="ts">
definePageMeta({
  layout: false,
  public: true,
})

defineI18nRoute({
  paths: {
    en: "/forgot-password",
    fr: "/mot-de-passe-oublie",
  },
})

const { t } = useI18n()
const requestUrl = useRequestURL()

useSeoMeta({
  title: () => t("auth.forgotPassword.seo.title"),
  description: () => t("auth.forgotPassword.seo.description"),
  ogTitle: () => t("auth.forgotPassword.seo.title"),
  ogDescription: () => t("auth.forgotPassword.seo.description"),
  ogUrl: requestUrl.href,
  robots: "noindex, nofollow",
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 py-12">
    <section class="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
      <Icon name="ph:lock-key" class="mx-auto size-12 text-primary" aria-hidden="true" />
      <h1 class="mt-6 text-2xl font-semibold text-foreground">
        {{ t("auth.forgotPassword.heading") }}
      </h1>
      <p class="mt-4 text-muted-foreground">
        {{ t("auth.forgotPassword.description") }}
      </p>
      <NuxtLinkLocale
        to="/login"
        class="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {{ t("auth.forgotPassword.backToLogin") }}
      </NuxtLinkLocale>
    </section>
  </main>
</template>
