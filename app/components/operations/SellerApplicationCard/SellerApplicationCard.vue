<script setup lang="ts">
import type { SellerReviewListItem } from "@/types/api/marketplace-moderation"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { sellerApplicationBadges } from "@/utils/seller-applications"

/**
 * One application in the list (12 November 2026): whether it holds documents and how many wait for
 * the team, whether it was completed after a refusal, and its last upload before its signup date.
 */
const { seller, selected, statusLabel } = defineProps<{
  seller: SellerReviewListItem
  selected: boolean
  statusLabel: string
}>()
defineEmits<{ select: [id: string] }>()
const { t, locale } = useI18n({ useScope: "local" })

const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const badges = computed(() => sellerApplicationBadges(seller))

/** The documents line, absent when an older backend does not send the counts. */
const documents = computed(() => {
  const count = seller.nombrePieces
  if (count === undefined) return null
  if (!count) return { empty: true, icon: "ph:warning", text: t("noDocument") }
  const toReview = seller.piecesAVerifier ? ` · ${t("toReview", { count: seller.piecesAVerifier })}` : ""
  return { empty: false, icon: "ph:paperclip", text: `${t("documents", { count }, count)}${toReview}` }
})

const dates = computed(() => {
  const signedUp = t("signedUp", { date: date.value.format(new Date(seller.creeLe)) })
  if (!seller.derniereSoumissionLe) return signedUp
  return `${t("lastUpload", { date: date.value.format(new Date(seller.derniereSoumissionLe)) })} · ${signedUp}`
})
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
    :class="selected ? 'border-l-4 border-l-primary bg-muted' : 'border-l-4 border-l-transparent'"
    :data-testid="`seller-application-${seller.id}`"
    @click="$emit('select', seller.id)"
  >
    <span class="flex w-full items-start justify-between gap-2"
      ><strong class="truncate text-sm font-medium">{{ seller.nomLegal }}</strong
      ><Badge class="shrink-0 border-0 px-2 py-0 text-[10px]">{{ statusLabel }}</Badge></span
    >
    <span class="truncate text-xs text-muted-foreground">{{ seller.boutiques.map(item => item.nom).join(", ") }}</span>
    <span v-if="badges.completed || badges.renewal" class="flex flex-wrap gap-1">
      <Badge
        v-if="badges.completed"
        variant="outline"
        class="border-emerald-600 px-1.5 py-0 text-[10px] text-emerald-700"
        data-testid="seller-application-completed"
        ><Icon name="ph:arrow-clockwise" /> {{ t("completed") }}</Badge
      >
      <Badge
        v-if="badges.renewal"
        variant="outline"
        class="px-1.5 py-0 text-[10px]"
        data-testid="seller-application-renewal"
        >{{ t("renewal") }}</Badge
      >
    </span>
    <span
      v-if="documents"
      class="flex items-center gap-1 text-xs"
      :class="documents.empty ? 'text-destructive' : 'text-foreground'"
      data-testid="seller-application-documents"
      ><Icon :name="documents.icon" />{{ documents.text }}</span
    >
    <span class="text-[11px] text-muted-foreground">{{ dates }}</span>
  </button>
</template>

<i18n lang="json">
{
  "en": {
    "completed": "Completed",
    "renewal": "Already approved",
    "documents": "{count} document | {count} documents",
    "toReview": "{count} to review",
    "noDocument": "No document",
    "lastUpload": "Last upload {date}",
    "signedUp": "signed up {date}"
  },
  "fr": {
    "completed": "Complété",
    "renewal": "Déjà validé",
    "documents": "{count} pièce | {count} pièces",
    "toReview": "{count} à vérifier",
    "noDocument": "Aucune pièce",
    "lastUpload": "Dernier dépôt {date}",
    "signedUp": "inscrit le {date}"
  }
}
</i18n>
