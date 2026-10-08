<script setup lang="ts">
import type { ProductCopySuggestion } from "@/types/ai/product-copy"
import { computed } from "vue"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = defineProps<{ suggestion: Partial<ProductCopySuggestion> }>()

const ROW_FIELDS = [
  "name",
  "brand",
  "department",
  "primaryCategory",
  "secondaryCategories",
  "shortDescription",
  "longDescription",
] as const

const { t } = useI18n()
const { departmentName, categoryName } = useProductCopyLabels()
const { logoDevPublishableKey } = useRuntimeConfig().public

/** What the operator reads for one field: names instead of the slugs and ids a choice field carries. */
function readable(field: (typeof ROW_FIELDS)[number]): string | null {
  const { suggestion } = props
  if (field === "department") return suggestion.department ? departmentName(suggestion.department) : null
  if (field === "primaryCategory") {
    return suggestion.primaryCategory === undefined ? null : categoryName(suggestion.primaryCategory)
  }
  if (field === "secondaryCategories") return suggestion.secondaryCategories?.map(categoryName).join(", ") || null
  return suggestion[field] ?? null
}

const rows = computed(() =>
  ROW_FIELDS.flatMap(field => {
    const text = readable(field)
    return text ? [{ field, text }] : []
  }),
)
</script>

<template>
  <dl class="flex flex-col gap-4">
    <div v-for="row in rows" :key="row.field" :data-testid="`ai-generation-history-field-${row.field}`">
      <dt class="mb-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {{ t(`products.aiCopy.popup.history.fields.${row.field}`) }}
      </dt>
      <dd
        :class="
          row.field === 'name' ? 'text-sm leading-snug font-semibold' : 'text-sm leading-relaxed whitespace-pre-line'
        "
      >
        <span v-if="row.field === 'brand'" class="flex items-center gap-2 font-medium">
          <ProductsBrandLogo
            :brand="row.text"
            :image-url="logoDevNameUrl(row.text, logoDevPublishableKey)"
            size="sm"
            decorative
          />
          {{ row.text }}
        </span>
        <template v-else>{{ row.text }}</template>
      </dd>
    </div>
    <div v-if="suggestion.features?.length" data-testid="ai-generation-history-field-features">
      <dt class="mb-2 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {{ t("products.aiCopy.popup.history.fields.features") }}
      </dt>
      <dd>
        <ul class="flex flex-wrap gap-2">
          <li v-for="feature in suggestion.features" :key="feature" class="rounded-full bg-muted px-2.5 py-1 text-xs">
            {{ feature }}
          </li>
        </ul>
      </dd>
    </div>
  </dl>
</template>
