<script setup lang="ts">
import type { StockStatus } from "@/types/api/catalogue-products"
import { Badge } from "@/components/ui/badge"
const { status } = defineProps<{ status: StockStatus }>()
const { t } = useI18n()
const VARIANTS: Record<StockStatus, "success" | "destructive" | "warning"> = {
  en_stock: "success",
  rupture: "destructive",
  reapprovisionnement: "warning",
}
</script>
<template>
  <Badge :variant="VARIANTS[status]" :data-testid="`availability-${status}`">{{
    t(`catalogue.availability.statuses.${status}`)
  }}</Badge>
</template>
