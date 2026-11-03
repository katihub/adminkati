<script setup lang="ts">
import { onMounted, ref } from "vue"

/**
 * « CHOISIR MON MOT DE PASSE ». The Supabase link (team invitation or « mot de passe oublié ») lands
 * here with its session in the URL fragment; the fragment never reaches a server log. The password
 * is set through our server route, then the member signs in normally.
 */
definePageMeta({ layout: false, public: true })
defineI18nRoute({ paths: { en: "/choose-password", fr: "/choisir-mot-de-passe" } })
useSeoMeta({ robots: "noindex, nofollow" })

const { t } = useI18n({ useScope: "local" })
const { $csrfFetch } = useNuxtApp()
const accessToken = ref("")
const linkError = ref(false)
const password = ref("")
const confirmation = ref("")
const pending = ref(false)
const error = ref("")
const done = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  accessToken.value = params.get("access_token") ?? ""
  linkError.value = !accessToken.value || params.has("error")
  // The token stays in memory only: removing it from the address bar keeps it out of history and screenshots.
  if (window.location.hash) history.replaceState(null, "", window.location.pathname)
})

async function submit() {
  error.value = ""
  if (password.value.length < 8) return (error.value = t("tooShort"))
  if (password.value !== confirmation.value) return (error.value = t("mismatch"))
  pending.value = true
  try {
    await $csrfFetch("/api/auth/password", {
      method: "POST",
      body: { accessToken: accessToken.value, password: password.value },
    })
    done.value = true
  } catch (cause: any) {
    error.value = cause?.data?.reason === "expired_link" ? t("expired") : t("rejected")
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 py-12">
    <section
      class="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12"
      data-testid="choose-password"
    >
      <BrandWordmark class="mx-auto" />
      <h1 class="mt-6 text-center text-2xl font-semibold text-foreground">{{ t("heading") }}</h1>

      <div v-if="done" class="mt-6 text-center" data-testid="choose-password-done">
        <p class="text-muted-foreground">{{ t("done") }}</p>
        <NuxtLinkLocale
          to="/login"
          class="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >{{ t("toLogin") }}</NuxtLinkLocale
        >
      </div>

      <div v-else-if="linkError" class="mt-6 text-center" data-testid="choose-password-invalid">
        <p class="text-muted-foreground">{{ t("invalid") }}</p>
        <NuxtLinkLocale to="/forgot-password" class="mt-6 inline-block text-sm font-semibold text-primary underline">{{
          t("newLink")
        }}</NuxtLinkLocale>
      </div>

      <form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
        <p class="text-center text-sm text-muted-foreground">{{ t("intro") }}</p>
        <label class="flex flex-col gap-1 text-sm font-medium"
          >{{ t("password") }}
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            class="h-11 rounded-md border border-input bg-background px-3"
            data-testid="choose-password-new"
        /></label>
        <label class="flex flex-col gap-1 text-sm font-medium"
          >{{ t("confirm") }}
          <input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            required
            class="h-11 rounded-md border border-input bg-background px-3"
            data-testid="choose-password-confirm"
        /></label>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <button
          type="submit"
          :disabled="pending"
          class="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          data-testid="choose-password-submit"
        >
          {{ pending ? t("saving") : t("save") }}
        </button>
      </form>
    </section>
  </main>
</template>

<i18n lang="json">
{
  "en": {
    "heading": "Choose your password",
    "intro": "At least 8 characters. You will then sign in with your e-mail address and this password.",
    "password": "New password",
    "confirm": "Confirm the password",
    "save": "Save my password",
    "saving": "Saving…",
    "tooShort": "The password needs at least 8 characters.",
    "mismatch": "The two passwords do not match.",
    "expired": "This link has expired or was already used. Ask for a new one.",
    "rejected": "The password could not be saved. Try another one, or ask for a new link.",
    "done": "Your password is saved. You can now sign in.",
    "toLogin": "Sign in",
    "invalid": "This link is invalid or has expired.",
    "newLink": "Get a new link"
  },
  "fr": {
    "heading": "Choisissez votre mot de passe",
    "intro": "8 caractères au moins. Vous vous connecterez ensuite avec votre adresse e-mail et ce mot de passe.",
    "password": "Nouveau mot de passe",
    "confirm": "Confirmez le mot de passe",
    "save": "Enregistrer mon mot de passe",
    "saving": "Enregistrement…",
    "tooShort": "Le mot de passe doit compter au moins 8 caractères.",
    "mismatch": "Les deux mots de passe ne correspondent pas.",
    "expired": "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.",
    "rejected": "Le mot de passe n’a pas pu être enregistré. Essayez-en un autre, ou demandez un nouveau lien.",
    "done": "Votre mot de passe est enregistré. Vous pouvez maintenant vous connecter.",
    "toLogin": "Se connecter",
    "invalid": "Ce lien est invalide ou a expiré.",
    "newLink": "Recevoir un nouveau lien"
  }
}
</i18n>
