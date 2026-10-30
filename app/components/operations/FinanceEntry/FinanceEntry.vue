<script setup lang="ts">
import type { SellerFinanceSummary } from "@/types/api/seller-finance"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"
const { transaction } = defineProps<{ transaction: SellerFinanceSummary["transactions"][number] }>()
const { t, locale } = useI18n({ useScope: "local" })
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
</script>
<template>
  <li class="space-y-2 py-4">
    <div class="flex flex-wrap justify-between gap-2">
      <strong class="text-sm">{{ transaction.libelle }}</strong
      ><time class="text-xs text-muted-foreground">{{ formatDateCourte(transaction.creeLe, locale) }}</time>
    </div>
    <p class="break-all font-mono text-xs text-muted-foreground">{{ transaction.type }} · {{ transaction.id }}</p>
    <p v-if="transaction.sousCommandeId" class="break-all text-xs text-muted-foreground">
      {{ t("order") }} : {{ transaction.sousCommandeId }}
    </p>
    <dl
      v-for="(entry, index) in transaction.ecritures"
      :key="index"
      class="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/60 p-2 text-sm"
    >
      <dt>
        {{ entry.compte.replaceAll("_", " ") }} · {{ entry.sens
        }}<span v-if="entry.libelle"> · {{ entry.libelle }}</span>
      </dt>
      <dd class="font-semibold">{{ money.format(entry.montantFcfa) }}</dd>
    </dl>
  </li>
</template>
<i18n lang="json">
{ "en": { "order": "Sub-order" }, "fr": { "order": "Sous-commande" } }
</i18n>
