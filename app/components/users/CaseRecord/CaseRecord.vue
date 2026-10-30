<script setup lang="ts">
import type { CustomerActivity } from "@/types/api/customer-activity"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"
const { item } = defineProps<{ item: CustomerActivity["dossiers"]["elements"][number] }>()
const { t, locale } = useI18n()
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
</script>
<template>
  <li class="flex flex-col gap-2 py-4" data-testid="customer-case">
    <div class="flex flex-wrap justify-between gap-2">
      <strong>{{ item.reference }}</strong
      ><span class="text-xs">{{ t(`operations.disputes.requestStatus.${item.statut}`, item.statut) }}</span>
    </div>
    <p class="text-sm font-medium">{{ item.objet }}</p>
    <p class="whitespace-pre-wrap text-sm text-muted-foreground">{{ item.description }}</p>
    <p class="text-xs text-muted-foreground">
      {{ item.commande.reference }} · {{ item.boutique.nom }} · {{ formatDateCourte(item.creeLe, locale) }}
    </p>
    <template v-if="item.retour">
      <NuxtLinkLocale
        :to="{ path: '/operations', query: { tab: 'marketplace-disputes', retour: item.retour.id } }"
        class="text-sm font-semibold text-primary underline underline-offset-4"
        >{{ t("users.activity.openReturn") }}</NuxtLinkLocale
      >
      <p class="text-sm">
        {{ t("users.activity.refunded", { amount: money.format(item.retour.montantRembourseFcfa) }) }} ·
        {{ t(`operations.disputes.status.${item.retour.statut}`) }}
      </p>
      <p v-if="item.retour.remboursementPsp" class="break-all text-xs text-muted-foreground">
        {{ t(`operations.disputes.pspStatus.${item.retour.remboursementPsp.statut}`) }} ·
        {{ item.retour.remboursementPsp.transId }}
      </p>
      <p v-if="item.retour.referenceRemboursement" class="break-all font-mono text-xs text-muted-foreground">
        {{ item.retour.referenceRemboursement }}
      </p>
    </template>
  </li>
</template>
