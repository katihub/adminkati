<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
import { deriveProductStatus } from "@/utils/product-status"

const { product } = defineProps<{
  product: ProductDetail | null
}>()

const { locale, t } = useI18n()

const status = computed(() => {
  if (!product) return "en-stock"
  return deriveProductStatus(product.statut_stock, product.retire_le)
})

const priceFormatted = computed(() => {
  if (!product?.prix) return "—"
  return formatMontant(product.prix, locale.value).affiche
})

function hasMediaOrFeatures(item: ProductDetail): boolean {
  return item.images.length > 0 || item.caracteristiques.length > 0
}

function hasBasics(item: ProductDetail): boolean {
  return Boolean(item.nom && item.prix > 0)
}

function computeCompletenessScore(item: ProductDetail | null): number {
  if (!item) return 0
  let count = 0
  if (hasBasics(item)) count += 1
  if (hasMediaOrFeatures(item)) count += 1
  return count
}

const completeness = computed(() => {
  const count = computeCompletenessScore(product)
  const total = 2
  const pctNumber = Math.round((count / total) * 100)
  return {
    score: count,
    text: `${count} / ${total}`,
    pct: `${pctNumber}%`,
    pctNumber,
  }
})
</script>

<!-- fallow-ignore-next-line complexity -->
<template>
  <div v-if="product" class="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="products-summary-kpis">
    <!-- Card 1: Statut Compte / Stock -->
    <div class="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{{ t("products.kpis.stockStatus") }}</span>
        <div class="flex size-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Icon name="ph:user" size="14" aria-hidden="true" />
        </div>
      </div>
      <div class="mt-3">
        <Badge
          variant="secondary"
          class="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          <span class="mr-1.5 size-1.5 rounded-full bg-muted-foreground" />
          {{ t(`products.listItem.status.${status}`) }}
        </Badge>
      </div>
    </div>

    <!-- Card 2: Statut KYC / Tarification -->
    <div class="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{{ t("products.kpis.pricing") }}</span>
        <div class="flex size-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Icon name="ph:shield-check" size="14" aria-hidden="true" />
        </div>
      </div>
      <div class="mt-3">
        <Badge
          variant="secondary"
          class="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground font-mono"
        >
          <span class="mr-1.5 size-1.5 rounded-full bg-muted-foreground" />
          {{ priceFormatted }}
        </Badge>
      </div>
    </div>

    <!-- Card 3: Vérifications / Complétude -->
    <div class="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{{ t("products.kpis.completeness") }}</span>
        <div class="flex size-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Icon name="ph:shield" size="14" aria-hidden="true" />
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-base font-bold text-foreground">{{ completeness.text }}</span>
        <span
          class="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
        >
          {{ completeness.pct }}
        </span>
      </div>
    </div>

    <!-- Card 4: Rôle principal / Catégorie -->
    <div class="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{{ t("products.kpis.category") }}</span>
        <div class="flex size-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Icon name="ph:users" size="14" aria-hidden="true" />
        </div>
      </div>
      <div class="mt-3 truncate">
        <span
          class="truncate text-base font-bold text-foreground"
          :title="product.categorie_nom || product.categories?.[0]?.nom || '—'"
        >
          {{ product.categorie_nom || product.categories?.[0]?.nom || t("products.kpis.general") }}
        </span>
      </div>
    </div>
  </div>
</template>
