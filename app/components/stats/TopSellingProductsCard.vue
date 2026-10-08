<script setup lang="ts">
import type { TopSellingProductItem } from "@/types/api/statistiques"
import { computed } from "vue"
import { formatMontant } from "@/utils/money"

const { products } = defineProps<{
  products: TopSellingProductItem[]
}>()

const { locale, t } = useI18n()

const showEarnings = computed(() => products.some(product => product.earnings !== undefined))
</script>

<template>
  <div
    class="flex flex-col rounded-2xl border border-border/40 bg-card p-5 text-card-foreground shadow-xs lg:col-span-5"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-base font-medium text-foreground">
        {{ t("stats.products.topSellingTitle") }}
      </h3>
      <StatsCardLink to="/products" :label="t('stats.actions.viewMore')" />
    </div>

    <div class="mt-4 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="rounded-xl bg-muted/40 text-xs font-semibold text-muted-foreground">
            <th class="px-4 py-2.5">
              {{ t("stats.products.columnProducts") }}
            </th>
            <th class="px-4 py-2.5 text-right">
              {{ t("stats.products.columnSales") }}
            </th>
            <th v-if="showEarnings" class="px-4 py-2.5 text-right">
              {{ t("stats.products.columnEarnings") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/30">
          <tr v-for="product in products" :key="product.id" class="transition-colors hover:bg-muted/30">
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <ProductsPicture
                    v-if="product.image"
                    :src="product.image"
                    :alt="t('stats.products.thumbnailAlt', { nom: product.name })"
                    width="44"
                    height="44"
                    loading="eager"
                    class="size-full object-cover"
                  />
                  <div
                    v-else
                    class="flex size-full items-center justify-center text-xs font-bold text-muted-foreground"
                  >
                    {{ product.name.slice(0, 1) }}
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-foreground" :title="product.name">
                    {{ product.name }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3.5 text-right font-medium whitespace-nowrap text-muted-foreground">
              {{ t("stats.products.units", { count: product.sales.toLocaleString(locale) }) }}
            </td>
            <td v-if="showEarnings" class="px-4 py-3.5 text-right font-bold whitespace-nowrap text-foreground">
              <template v-if="product.earnings !== undefined">
                <span :title="formatMontant(product.earnings, locale).exact">
                  {{ formatMontant(product.earnings, locale).affiche }}
                </span>
              </template>
              <span v-else aria-label="N/A">{{ t("stats.indisponible") }}</span>
            </td>
          </tr>
          <tr v-if="products.length === 0">
            <td :colspan="showEarnings ? 3 : 2" class="px-4 py-8 text-center text-xs text-muted-foreground">
              {{ t("stats.vide") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
