<script setup lang="ts">
import type { AdminMarketplaceOfferDetail } from "@/types/api/catalogue-products"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"
const { offer } = defineProps<{ offer: AdminMarketplaceOfferDetail["offre"] }>()
const { t, locale } = useI18n()
const amount = (value: number | null) => (value === null ? "—" : formatMontant(value, locale.value).exact)
const dash = (value: number | null | undefined) => value ?? "—"
const stock = computed(() => `${dash(offer.stock?.quantite)} / ${dash(offer.stock?.quantiteReservee)}`)
const facts = computed(() => [
  { key: "price", value: amount(offer.prixFcfa) },
  { key: "referencePrice", value: amount(offer.prixReferenceFcfa) },
  { key: "moq", value: offer.quantiteMinimale },
  { key: "warranty", value: offer.garantieMois },
  { key: "delay", value: offer.delaiMaxJours },
  { key: "stock", value: stock.value },
  { key: "variant", value: offer.libelleVariante },
])
</script>
<template>
  <dl class="grid grid-cols-2 gap-4 text-sm">
    <div v-for="fact in facts" :key="fact.key">
      <dt class="text-xs text-muted-foreground">{{ t(`catalogue.${fact.key}`) }}</dt>
      <dd class="mt-1 break-words font-medium">{{ fact.value ?? "—" }}</dd>
    </div>
  </dl>
  <section class="flex flex-col gap-2">
    <h3 class="text-sm font-semibold">{{ t("catalogue.delivery") }}</h3>
    <p class="text-sm text-muted-foreground">
      {{ offer.villesLivraison.join(", ") }} · {{ offer.modesLivraison.join(", ") }}
    </p>
    <p class="text-xs text-muted-foreground">{{ t("catalogue.stockHelp") }}</p>
  </section>
  <section v-if="offer.revisions.length" class="flex flex-col gap-3">
    <h3 class="text-sm font-semibold">{{ t("catalogue.revisions") }}</h3>
    <ol class="flex flex-col gap-2 text-sm">
      <li v-for="revision in offer.revisions" :key="revision.id" class="rounded-lg border border-border p-3">
        <p>
          #{{ revision.numero }} · {{ t(`catalogue.status.${revision.statut}`) }} ·
          {{ formatDateCourte(revision.soumisLe, locale) }}
        </p>
        <p v-if="revision.motifDecision" class="mt-1 text-muted-foreground">{{ revision.motifDecision }}</p>
      </li>
    </ol>
  </section>
</template>
