<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed, toRefs } from "vue"

const props = defineProps<{
  product: ProductDetail | null
}>()
const { product } = toRefs(props)

const { locale, t } = useI18n()
const withdrawnDateLabel = computed(() =>
  product.value?.retire_le ? formatDateCourte(product.value.retire_le, locale.value) : "",
)
</script>

<template>
  <p
    data-testid="products-detail-form-withdrawn-banner"
    class="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
  >
    {{ t("products.detailForm.withdrawnBanner", { date: withdrawnDateLabel }) }}
  </p>
</template>
