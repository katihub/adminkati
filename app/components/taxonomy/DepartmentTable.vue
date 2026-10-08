<script setup lang="ts">
import type { Rayon } from "@/types/api/taxonomie"
import type { FlatTaxonomySort } from "@/utils/taxonomy-table"
import TaxonomyFlatTableState from "@/components/taxonomy/TaxonomyFlatTableState.vue"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"

const props = withDefaults(
  defineProps<{
    departments: Rayon[]
    sort: FlatTaxonomySort
    loading?: boolean
    error?: unknown
    empty?: boolean
    filtered?: boolean
    canWrite?: boolean
  }>(),
  {
    loading: false,
    error: undefined,
    empty: false,
    filtered: false,
    canWrite: false,
  },
)

const emit = defineEmits<{
  select: [department: Rayon]
  sort: [key: FlatTaxonomySort["key"]]
  retry: []
  clear: []
  add: []
}>()

const { t } = useI18n()

function ariaSort(key: FlatTaxonomySort["key"]) {
  if (props.sort.key !== key) return "none"
  return props.sort.direction === "asc" ? "ascending" : "descending"
}
</script>

<template>
  <section data-testid="department-table">
    <TaxonomyFlatTableState
      :loading="loading"
      :error="error"
      :empty="empty"
      :filtered="filtered && departments.length === 0"
      :can-write="canWrite"
      :empty-title="t('taxonomy.departments.empty')"
      :filtered-title="t('taxonomy.departments.noResults')"
      :add-label="t('taxonomy.departments.add')"
      :clear-label="t('taxonomy.departments.clear')"
      empty-icon="ph:storefront"
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
                data-testid="department-sort-name"
                :aria-sort="ariaSort('nom')"
                @click="emit('sort', 'nom')"
              >
                {{ t("taxonomy.departments.name") }}
              </button>
            </Table.Head>
            <Table.Head scope="col">
              <button
                type="button"
                data-testid="department-sort-short-name"
                :aria-sort="ariaSort('nom_court')"
                @click="emit('sort', 'nom_court')"
              >
                {{ t("taxonomy.departments.shortName") }}
              </button>
            </Table.Head>
            <Table.Head scope="col">
              <button
                type="button"
                data-testid="department-sort-products"
                :aria-sort="ariaSort('compte_total')"
                @click="emit('sort', 'compte_total')"
              >
                {{ t("taxonomy.departments.products") }}
              </button>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row
            v-for="department in departments"
            :key="department.id"
            :data-testid="`department-row-${department.id}`"
            class="cursor-pointer"
            @click="emit('select', department)"
          >
            <Table.Cell class="rounded-l-lg py-3">
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground"
                >
                  <Icon name="ph:storefront" size="18" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-foreground">
                    {{ department.nom }}
                  </p>
                  <p class="truncate font-mono text-xs text-muted-foreground">
                    {{ department.slug }}
                  </p>
                </div>
              </div>
            </Table.Cell>
            <Table.Cell class="py-3 text-muted-foreground">
              {{ department.nom_court || "—" }}
            </Table.Cell>
            <Table.Cell class="rounded-r-lg py-3">
              <Badge variant="secondary" class="rounded-full px-2.5 py-0.5 font-mono text-xs">
                {{ department.compte_total }}
              </Badge>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </TaxonomyFlatTableState>
  </section>
</template>
