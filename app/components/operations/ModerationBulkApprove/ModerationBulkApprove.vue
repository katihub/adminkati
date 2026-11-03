<script setup lang="ts">
import type { ModerationBatchResult } from "@/types/api/marketplace-moderation"
import { toast } from "vue-sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useMarketplaceCatalogueModerationMutations } from "@/composables/useMarketplaceModeration"
import { apiErrorText } from "@/utils/api-error"

/**
 * « APPROVE ALL »: the whole visible queue in one click, after a confirmation. The backend claims,
 * decides and journals each item as the one-by-one approval does; a product also gets its photos
 * published. Refusals (already decided, out of a focal point's scope) are counted, never silent.
 */
const MAX = 100
const { kind, ids } = defineProps<{ kind: "products" | "offers"; ids: string[] }>()
const { t } = useI18n({ useScope: "local" })
const mutations = useMarketplaceCatalogueModerationMutations()
const open = ref(false)
const batch = computed(() => ids.slice(0, MAX))
const pending = computed(() => mutations.approveProducts.isPending.value || mutations.approveOffers.isPending.value)
const help = computed(() =>
  kind === "products"
    ? t("helpProducts", { count: batch.value.length })
    : t("helpOffers", { count: batch.value.length }),
)

async function approve() {
  try {
    const result: ModerationBatchResult =
      kind === "products"
        ? await mutations.approveProducts.mutateAsync(batch.value)
        : await mutations.approveOffers.mutateAsync(batch.value)
    if (result.approuves.length) toast.success(t("approved", { count: result.approuves.length }))
    if (result.echecs.length)
      toast.error(t("failed", { count: result.echecs.length, reason: result.echecs[0]!.message }))
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  } finally {
    open.value = false
  }
}
</script>

<template>
  <div v-if="batch.length">
    <Button size="sm" class="w-full" :disabled="pending" data-testid="catalogue-approve-all" @click="open = true"
      ><Icon name="ph:checks" /> {{ t("button", { count: batch.length }) }}</Button
    >
    <AlertDialog v-model:open="open">
      <AlertDialogContent data-testid="catalogue-approve-all-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("title", { count: batch.length }) }}</AlertDialogTitle>
          <AlertDialogDescription>{{ help }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">{{ t("cancel") }}</AlertDialogCancel>
          <AlertDialogAction :disabled="pending" data-testid="catalogue-approve-all-confirm" @click.prevent="approve">{{
            t("confirm")
          }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "button": "Approve all ({count})",
    "title": "Approve {count} items?",
    "helpProducts": "The {count} products shown are approved, with the photos the shops sent. The shops can then put them on sale.",
    "helpOffers": "The {count} offers shown are published on the marketplace with their price and terms.",
    "cancel": "Cancel",
    "confirm": "Approve all",
    "approved": "{count} approved.",
    "failed": "{count} not approved: {reason}"
  },
  "fr": {
    "button": "Tout approuver ({count})",
    "title": "Approuver {count} éléments ?",
    "helpProducts": "Les {count} produits affichés sont approuvés, avec les photos envoyées par les boutiques. Les boutiques pourront ensuite les mettre en vente.",
    "helpOffers": "Les {count} offres affichées sont publiées sur la marketplace, avec leur prix et leurs conditions.",
    "cancel": "Annuler",
    "confirm": "Tout approuver",
    "approved": "{count} approuvé(s).",
    "failed": "{count} non approuvé(s) : {reason}"
  }
}
</i18n>
