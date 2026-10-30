<script setup lang="ts">
import type { CataloguePagination } from "@/types/api/catalogue-products"
import { Button } from "@/components/ui/button"
defineProps<{ pagination: CataloguePagination; loading: boolean }>()
const emit = defineEmits<{ page: [page: number] }>()
const { t } = useI18n()
</script>
<template>
  <nav class="flex items-center justify-between gap-2" :aria-label="t('catalogue.title')">
    <Button
      variant="outline"
      size="sm"
      :disabled="loading || pagination.page <= 1"
      data-testid="marketplace-products-previous"
      @click="emit('page', pagination.page - 1)"
      >{{ t("catalogue.previous") }}</Button
    ><span class="text-xs text-muted-foreground">{{
      t("catalogue.page", { page: pagination.page, pages: pagination.pages })
    }}</span
    ><Button
      variant="outline"
      size="sm"
      :disabled="loading || pagination.page >= pagination.pages"
      data-testid="marketplace-products-next"
      @click="emit('page', pagination.page + 1)"
      >{{ t("catalogue.next") }}</Button
    >
  </nav>
</template>
