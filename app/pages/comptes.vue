<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: search, results and the selected account
import type { AccountSummary } from "@/types/api/accounts"
import { refDebounced } from "@vueuse/core"
import { computed, ref } from "vue"
import { useAccountSearch } from "@/composables/useAccounts"
import { accountKinds } from "@/utils/account-access"
import { apiErrorText } from "@/utils/api-error"

/* USER ACCOUNTS (9 November 2026): find a customer or a seller, see their
   sign-in state, and help them back in. The direction for every account; a
   focal point for the members of its shops. Team accounts stay in Team. */
definePageMeta({ layout: "admin", roles: ["direction", "point_focal"] })
defineI18nRoute({ paths: { en: "/comptes", fr: "/comptes" } })

const { t } = useI18n({ useScope: "local" })
const { t: tGlobal } = useI18n()
useSeoMeta({ title: () => t("seoTitle"), robots: "noindex, nofollow" })

const search = ref("")
const debounced = refDebounced(search, 300)
const results = useAccountSearch(debounced)
const selected = ref<string | null>(null)
const accounts = computed(() => (debounced.value.trim().length >= 3 ? (results.data.value ?? []) : []))
/* Explicit keys: the translation check reads every label. */
const kindsText = (account: AccountSummary) =>
  accountKinds(account)
    .map(kind => (kind === "seller" ? t("kind.seller") : t("kind.client")))
    .join(" · ")
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6" data-testid="accounts-page">
    <div>
      <h1 class="text-2xl font-semibold text-foreground">{{ t("heading") }}</h1>
      <p class="text-sm text-muted-foreground">{{ t("help") }}</p>
    </div>
    <label class="relative max-w-xl">
      <Icon
        name="ph:magnifying-glass"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        v-model="search"
        class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
        :placeholder="t('search')"
        :aria-label="t('search')"
        data-testid="accounts-search"
      />
    </label>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div class="min-w-0">
        <p v-if="debounced.trim().length < 3" class="text-sm text-muted-foreground">{{ t("type") }}</p>
        <p v-else-if="results.isPending.value" class="text-sm text-muted-foreground">{{ t("searching") }}</p>
        <p v-else-if="results.error.value" class="text-sm text-destructive" role="alert">
          {{ apiErrorText(results.error.value, tGlobal) }}
        </p>
        <p v-else-if="!accounts.length" class="text-sm text-muted-foreground">{{ t("none") }}</p>
        <ul v-else class="grid gap-2">
          <li v-for="account in accounts" :key="account.courriel">
            <button
              type="button"
              class="w-full rounded-lg border p-3 text-left transition"
              :class="
                selected === account.courriel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
              "
              :data-testid="`account-result-${account.courriel}`"
              @click="selected = account.courriel"
            >
              <strong class="block truncate text-sm">{{ account.nom ?? account.courriel }}</strong>
              <span class="block truncate text-xs text-muted-foreground"
                >{{ account.courriel }}<template v-if="account.telephone"> · {{ account.telephone }}</template></span
              >
              <span class="mt-1 block text-xs text-muted-foreground"
                >{{ kindsText(account)
                }}<template v-if="account.boutiques.length">
                  · {{ account.boutiques.map(shop => shop.nom).join(", ") }}</template
                ></span
              >
            </button>
          </li>
        </ul>
      </div>
      <div class="min-w-0">
        <AccountsAccountAccessPanel v-if="selected" :key="selected" :email="selected" />
        <p v-else class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {{ t("choose") }}
        </p>
      </div>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "fr": {
    "seoTitle": "Comptes utilisateurs · Administration KatiMarket",
    "heading": "Comptes utilisateurs",
    "help": "Retrouvez un client ou un vendeur et aidez-le à retrouver l’accès à son compte. Les comptes de l’équipe se gèrent dans Équipe.",
    "search": "E-mail, nom ou téléphone…",
    "type": "Tapez au moins 3 caractères.",
    "searching": "Recherche…",
    "none": "Aucun client ni vendeur trouvé.",
    "choose": "Choisissez un compte dans la liste.",
    "kind": { "client": "Client", "seller": "Vendeur" }
  },
  "en": {
    "seoTitle": "User accounts · KatiMarket administration",
    "heading": "User accounts",
    "help": "Find a customer or a seller and help them back into their account. Team accounts are managed in Team.",
    "search": "E-mail, name or phone…",
    "type": "Type at least 3 characters.",
    "searching": "Searching…",
    "none": "No customer or seller found.",
    "choose": "Pick an account from the list.",
    "kind": { "client": "Customer", "seller": "Seller" }
  }
}
</i18n>
