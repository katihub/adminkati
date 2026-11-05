<script setup lang="ts">
import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
import { computed } from "vue"

/**
 * What an individual seller told us about themselves at signup: birth, residence, and an optional
 * supplier or sponsor. Hidden when the seller gave none of it (a company, or an older application).
 */
const { seller } = defineProps<{ seller: SellerReviewDetail }>()
const { t, locale } = useI18n({ useScope: "local" })

const birthDate = computed(() =>
  seller.dateNaissance
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(seller.dateNaissance),
      )
    : null,
)
const residence = computed(() => [seller.quartierResidence, seller.villeResidence].filter(Boolean).join(", ") || null)
const sponsor = computed(() => [seller.parrainNom, seller.parrainTelephone].filter(Boolean).join(" · ") || null)
const visible = computed(() => Boolean(birthDate.value || seller.lieuNaissance || residence.value || sponsor.value))
</script>

<template>
  <section v-if="visible" class="rounded-lg border border-border bg-card" data-testid="seller-identity">
    <h3 class="border-b border-border p-4 font-heading font-semibold">{{ t("title") }}</h3>
    <dl class="grid gap-3 p-4 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("birth") }}</dt>
        <dd data-testid="seller-identity-birth">
          {{ birthDate ?? "—" }}<template v-if="seller.lieuNaissance"> · {{ seller.lieuNaissance }}</template>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("residence") }}</dt>
        <dd data-testid="seller-identity-residence">{{ residence ?? "—" }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted-foreground">{{ t("sponsor") }}</dt>
        <dd data-testid="seller-identity-sponsor">{{ sponsor ?? t("none") }}</dd>
      </div>
    </dl>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Individual seller",
    "birth": "Date and place of birth",
    "residence": "Place of residence",
    "sponsor": "Supplier or sponsor",
    "none": "None given"
  },
  "fr": {
    "title": "Vendeur particulier",
    "birth": "Date et lieu de naissance",
    "residence": "Résidence",
    "sponsor": "Fournisseur ou parrain",
    "none": "Non renseigné"
  }
}
</i18n>
