<script setup lang="ts">
import type { CaisseEncaissement } from "@/types/api/caisse"
import { computed } from "vue"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

export interface EnrichedEncaissement extends CaisseEncaissement {
  collectedByName: string
}

const { encaissements } = defineProps<{
  encaissements: EnrichedEncaissement[]
}>()

const { locale, t } = useI18n()
const sorted = computed(() => [...encaissements].sort((a, b) => a.creeLe.localeCompare(b.creeLe)))
</script>

<template>
  <section class="rounded-3xl bg-card p-4 sm:p-6" data-testid="caisse-encaissements-table">
    <h3 class="mb-4 border-b border-border/70 pb-4 font-heading text-lg font-semibold text-foreground">
      {{ t("caisse.detail.encaissementsTitle") }}
    </h3>

    <div
      v-if="sorted.length === 0"
      class="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
      data-testid="caisse-encaissements-empty"
    >
      {{ t("caisse.detail.noEncaissements") }}
    </div>

    <Table v-else>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.time") }}
          </TableHead>
          <TableHead class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.order") }}
          </TableHead>
          <TableHead class="text-right text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.amount") }}
          </TableHead>
          <TableHead class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.method") }}
          </TableHead>
          <TableHead class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.location") }}
          </TableHead>
          <TableHead class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ t("caisse.detail.collectedBy") }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="line in sorted" :key="line.id" data-testid="caisse-encaissement-row">
          <TableCell>{{ formatDateCourte(line.creeLe, locale) }}</TableCell>
          <TableCell>
            <NuxtLinkLocale
              v-if="line.commande"
              data-testid="caisse-encaissement-order-link"
              :to="{ path: '/orders', query: { order: line.commande.reference } }"
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              {{ line.commande.reference }}
            </NuxtLinkLocale>
          </TableCell>
          <TableCell class="text-right font-medium">
            {{ formatMontant(line.montant, locale).affiche }}
          </TableCell>
          <TableCell>{{ t(`caisse.moyen.${line.moyen}`) }}</TableCell>
          <TableCell>{{ t(`caisse.lieu.${line.lieu}`) }}</TableCell>
          <TableCell>{{ line.collectedByName }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </section>
</template>
