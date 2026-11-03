<script setup lang="ts">
import { ref } from "vue"

/**
 * « MOT DE PASSE OUBLIÉ » : Supabase sends a link to the page « Choisir mon mot de passe ». The same
 * confirmation shows whether the address exists or not, so the form never reveals who has an account.
 */
definePageMeta({ layout: false, public: true })
defineI18nRoute({ paths: { en: "/forgot-password", fr: "/mot-de-passe-oublie" } })

const { t } = useI18n({ useScope: "local" })
const { $csrfFetch } = useNuxtApp()
const requestUrl = useRequestURL()
useSeoMeta({
  title: () => t("seoTitle"),
  description: () => t("seoDescription"),
  ogTitle: () => t("seoTitle"),
  ogDescription: () => t("seoDescription"),
  ogUrl: requestUrl.href,
  robots: "noindex, nofollow",
})

const email = ref("")
const pending = ref(false)
const sent = ref(false)
const error = ref("")

async function submit() {
  error.value = ""
  pending.value = true
  try {
    await $csrfFetch("/api/auth/password-reset", { method: "POST", body: { email: email.value } })
    sent.value = true
  } catch {
    error.value = t("invalid")
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 py-12">
    <section class="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
      <Icon name="ph:lock-key" class="mx-auto size-12 text-primary" aria-hidden="true" />
      <h1 class="mt-6 text-2xl font-semibold text-foreground">
        {{ t("heading") }}
      </h1>
      <p v-if="sent" class="mt-4 text-muted-foreground" data-testid="forgot-password-sent">{{ t("sent") }}</p>
      <form v-else class="mt-6 flex flex-col gap-4 text-left" @submit.prevent="submit">
        <p class="text-center text-muted-foreground">{{ t("intro") }}</p>
        <label class="flex flex-col gap-1 text-sm font-medium"
          >{{ t("email") }}
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="h-11 rounded-md border border-input bg-background px-3"
            data-testid="forgot-password-email"
        /></label>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <button
          type="submit"
          :disabled="pending"
          class="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          data-testid="forgot-password-submit"
        >
          {{ pending ? t("sending") : t("send") }}
        </button>
      </form>
      <NuxtLinkLocale to="/login" class="mt-8 inline-block text-sm font-semibold text-primary underline">
        {{ t("backToLogin") }}
      </NuxtLinkLocale>
    </section>
  </main>
</template>

<i18n lang="json">
{
  "en": {
    "intro": "Enter the e-mail address of your account: we will send you a link to choose a new password.",
    "email": "E-mail address",
    "send": "Send me a link",
    "sending": "Sending…",
    "sent": "If an account uses this address, a link to choose a new password has just been sent. Check your spam folder too.",
    "invalid": "Enter a valid e-mail address.",
    "heading": "Password reset",
    "backToLogin": "Back to sign in",
    "seoTitle": "Password reset · KatiMarket Admin",
    "seoDescription": "Password reset information for the KatiMarket admin panel."
  },
  "fr": {
    "intro": "Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
    "email": "Adresse e-mail",
    "send": "Recevoir un lien",
    "sending": "Envoi…",
    "sent": "Si un compte utilise cette adresse, un lien pour choisir un nouveau mot de passe vient de partir. Pensez à regarder vos indésirables.",
    "invalid": "Indiquez une adresse e-mail valide.",
    "heading": "Réinitialisation du mot de passe",
    "backToLogin": "Retour à la connexion",
    "seoTitle": "Réinitialisation du mot de passe · Administration KatiMarket",
    "seoDescription": "Informations sur la réinitialisation du mot de passe pour l'administration KatiMarket."
  }
}
</i18n>
