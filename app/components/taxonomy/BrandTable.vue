<script setup lang="ts">
import type { Marque } from "@/types/api/taxonomie"
import type { BrandSort } from "@/utils/taxonomy-table"
import TaxonomyFlatTableState from "@/components/taxonomy/TaxonomyFlatTableState.vue"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = withDefaults(
  defineProps<{
    brands: Marque[]
    sort: BrandSort
    loading?: boolean
    error?: unknown
    empty?: boolean
    filtered?: boolean
  }>(),
  {
    loading: false,
    error: undefined,
    empty: false,
    filtered: false,
  },
)

const emit = defineEmits<{
  select: [brand: Marque]
  sort: [key: BrandSort["key"]]
  retry: []
  clear: []
  add: []
}>()

const { t } = useI18n()
const { logoDevPublishableKey } = useRuntimeConfig().public

function brandImageUrl(name: string): string | null {
  return logoDevNameUrl(name, logoDevPublishableKey)
}

function ariaSort(key: BrandSort["key"]) {
  if (props.sort.key !== key) return "none"
  return props.sort.direction === "asc" ? "ascending" : "descending"
}
</script>

<template>
  <section data-testid="brand-table">
    <TaxonomyFlatTableState
      :loading="loading"
      :error="error"
      :empty="empty"
      :filtered="filtered && brands.length === 0"
      :empty-title="t('taxonomy.brands.empty')"
      :filtered-title="t('taxonomy.brands.noResults')"
      :clear-label="t('taxonomy.brands.clear')"
      empty-icon="ph:tag"
      filtered-icon="ph:magnifying-glass"
      @retry="emit('retry')"
      @clear="emit('clear')"
      @add="emit('add')"
    >
      <Table.Root class="text-left">
        <Table.Header>
          <Table.Row>
            <Table.Head scope="col">
              <button
                type="button"
                data-testid="brand-sort-name"
                :aria-sort="ariaSort('nom')"
                @click="emit('sort', 'nom')"
              >
                {{ t("taxonomy.brands.name") }}
              </button>
            </Table.Head>
            <Table.Head scope="col">
              <button
                type="button"
                data-testid="brand-sort-slug"
                :aria-sort="ariaSort('slug')"
                @click="emit('sort', 'slug')"
              >
                {{ t("taxonomy.brands.slug") }}
              </button>
            </Table.Head>
            <Table.Head scope="col">
              <button
                type="button"
                data-testid="brand-sort-products"
                :aria-sort="ariaSort('nombre_produits')"
                @click="emit('sort', 'nombre_produits')"
              >
                {{ t("taxonomy.brands.products") }}
              </button>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row
            v-for="brand in brands"
            :key="brand.slug"
            :data-testid="`brand-row-${brand.slug}`"
            class="cursor-pointer"
            @click="emit('select', brand)"
          >
            <Table.Cell class="rounded-l-lg py-3">
              <div class="flex min-w-0 items-center gap-3">
                <ProductsBrandLogo
                  :brand="brand.nom"
                  :image-url="brandImageUrl(brand.nom)"
                  size="sm"
                  decorative
                  :test-id-prefix="`brand-logo-${brand.slug}`"
                  class="size-9 rounded-xl border border-border/60 bg-muted/40"
                />
                <span class="truncate font-medium text-foreground">{{ brand.nom }}</span>
              </div>
            </Table.Cell>
            <Table.Cell class="py-3 font-mono text-xs text-muted-foreground">
              {{ brand.slug }}
            </Table.Cell>
            <Table.Cell class="rounded-r-lg py-3">
              <Badge variant="secondary" class="rounded-full px-2.5 py-0.5 font-mono text-xs">
                {{ brand.nombre_produits }}
              </Badge>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </TaxonomyFlatTableState>
  </section>
</template>
