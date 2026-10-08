<script setup lang="ts">
import type { RecentTransactionItem, TransactionStatus } from "@/types/api/statistiques"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

const { transactions } = defineProps<{
  transactions: RecentTransactionItem[]
}>()

const { locale, t } = useI18n()

const showAmount = computed(() => transactions.some(transaction => transaction.amount !== undefined))

const CLASSES_STATUT: Record<TransactionStatus, string> = {
  in_progress: "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  canceled: "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  unverified: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
}

const LIBELLES_STATUT: Record<TransactionStatus, string> = {
  in_progress: "stats.status.inProgress",
  delivered: "stats.status.delivered",
  canceled: "stats.status.canceled",
  unverified: "stats.status.unverified",
}
</script>

<template>
  <div class="flex flex-col rounded-2xl bg-card p-5 text-card-foreground lg:col-span-7">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-xl font-medium tracking-tight text-foreground">
          {{ t("stats.transactions.title") }}
        </h3>
      </div>
      <StatsCardLink to="/orders" :label="t('stats.actions.viewMore')" />
    </div>

    <div class="mt-5 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="rounded-xl bg-muted/40 text-xs font-semibold text-muted-foreground">
            <th class="px-4 py-2.5 line-clamp-1">
              {{ t("stats.transactions.productName") }}
            </th>
            <th class="px-4 py-2.5">
              {{ t("stats.transactions.date") }}
            </th>
            <th v-if="showAmount" class="px-4 py-2.5 text-right">
              {{ t("stats.transactions.amount") }}
            </th>
            <th class="px-4 py-2.5 text-xs">
              {{ t("stats.transactions.status") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/30">
          <tr v-for="tx in transactions" :key="tx.id" class="transition-colors hover:bg-muted/30">
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="space-y-1">
                  <p class="font-semibold text-sm text-foreground">
                    {{ tx.productName }}
                  </p>
                  <p class="text-muted-foreground text-xs">
                    {{ tx.orderNumber }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3.5 text-xs whitespace-nowrap text-muted-foreground">
              {{ formatDateCourte(tx.date, locale) }}
            </td>
            <td v-if="showAmount" class="px-4 py-3.5 text-right font-bold whitespace-nowrap text-foreground">
              <template v-if="tx.amount !== undefined">
                <span :title="formatMontant(tx.amount, locale).exact">
                  {{ formatMontant(tx.amount, locale).affiche }}
                </span>
              </template>
              <span v-else aria-label="N/A">{{ t("stats.indisponible") }}</span>
            </td>
            <td class="px-4 py-3.5 w-max!">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold w-max!"
                :class="CLASSES_STATUT[tx.status]"
              >
                {{ t(LIBELLES_STATUT[tx.status]) }}
              </span>
            </td>
          </tr>
          <tr v-if="transactions.length === 0">
            <td :colspan="showAmount ? 4 : 3" class="px-4 py-8 text-center text-xs text-muted-foreground">
              {{ t("stats.vide") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
