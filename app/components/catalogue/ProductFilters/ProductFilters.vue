<script setup lang="ts">
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catalogueCategoryOptions } from "@/utils/catalogue-categories"
const { search, status, category, categories } = defineProps<{
  search: string
  status?: string
  category?: string
  categories: MarketplaceCategory[]
}>()
const emit = defineEmits<{
  "update:search": [value: string]
  filter: [changes: Record<string, string | undefined>]
  submit: []
}>()
const { t } = useI18n()
const statuses = [
  "brouillon",
  "soumis",
  "en_verification",
  "modification_demandee",
  "actif",
  "refuse",
  "suspendu",
  "archive",
]
const options = computed(() => catalogueCategoryOptions(categories))
</script>
<template>
  <form
    class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
    @submit.prevent="emit('submit')"
  >
    <Input
      :model-value="search"
      class="w-full min-w-0 flex-none sm:w-auto sm:flex-1"
      :placeholder="t('catalogue.search')"
      :aria-label="t('catalogue.search')"
      data-testid="catalogue-search"
      @update:model-value="emit('update:search', String($event))"
    />
    <select
      :value="category ?? ''"
      class="h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm"
      :aria-label="t('catalogue.category')"
      @change="emit('filter', { categorie: ($event.target as HTMLSelectElement).value || undefined })"
    >
      <option value="">{{ t("catalogue.allCategories") }}</option>
      <option v-for="option in options" :key="option.id" :value="option.id">{{ option.nom }}</option>
    </select>
    <select
      :value="status ?? ''"
      class="h-9 rounded-md border border-input bg-background px-3 text-sm"
      :aria-label="t('catalogue.statusLabel')"
      @change="emit('filter', { statut: ($event.target as HTMLSelectElement).value || undefined })"
    >
      <option value="">{{ t("catalogue.all") }}</option>
      <option v-for="value in statuses" :key="value" :value="value">{{ t(`catalogue.status.${value}`) }}</option>
    </select>
    <Button variant="outline" type="submit"
      ><Icon name="ph:magnifying-glass" data-icon="inline-start" />{{ t("catalogue.searchAction") }}</Button
    >
  </form>
</template>
