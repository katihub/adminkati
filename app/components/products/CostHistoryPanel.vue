<script setup lang="ts">
import { computed } from "vue"
import { useProductCosts } from "@/composables/useProductCosts"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

const { productId } = defineProps<{ productId: number }>()

const { locale, t } = useI18n()
const session = useCachedSession()
const canManage = computed(() => session.value?.roles.includes("direction") ?? false)
const costsQuery = useProductCosts(() => productId, canManage)
const entries = computed(() => costsQuery.data.value ?? [])
/* The template only unwraps top-level refs: `costsQuery.error` was a Ref object there, always
   truthy, so the error showed as soon as loading ended — even when the request succeeded. */
const costsError = costsQuery.error

const isLoading = computed(() => costsQuery.isPending.value || costsQuery.isFetching.value)
</script>

<template>
  <section
    v-if="canManage"
    data-testid="product-cost-history"
    class="rounded-2xl border border-border/40 bg-card p-5 text-card-foreground"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-base font-medium text-foreground">
        {{ t("products.costs.title") }}
      </h3>
      <ProductsAddCostDialog :product-id="productId" />
    </div>

    <p v-if="isLoading" class="mt-4 text-sm text-muted-foreground" aria-busy="true">
      {{ t("products.costs.loading") }}
    </p>
    <p v-else-if="costsError" class="mt-4 text-sm text-destructive" role="alert">
      {{ t("products.costs.loadError") }}
    </p>
    <p
      v-else-if="entries.length === 0"
      data-testid="product-cost-history-empty"
      class="mt-4 text-sm text-muted-foreground"
    >
      {{ t("products.costs.empty") }}
    </p>
    <ul v-else class="mt-4 divide-y divide-border/40 rounded-xl border border-border/40">
      <li v-for="entry in entries" :key="entry.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
        <span class="text-muted-foreground">{{ formatDateCourte(entry.effectiveAt, locale) }}</span>
        <span class="font-semibold" :title="formatMontant(entry.cost, locale).exact">{{
          formatMontant(entry.cost, locale).affiche
        }}</span>
      </li>
    </ul>
  </section>
</template>
