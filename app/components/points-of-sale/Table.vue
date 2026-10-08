<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteContactField } from "@/utils/point-of-sale"
import TaxonomyFlatTableState from "@/components/taxonomy/TaxonomyFlatTableState.vue"
import { Table } from "@/components/vuzeno/table"

withDefaults(
  defineProps<{
    /** `position` is the storefront position, which a filtered table must keep showing. */
    rows: { point: PointVenteAdmin; position: number }[]
    loading?: boolean
    error?: unknown
    empty?: boolean
    filtered?: boolean
    canWrite?: boolean
    arranging?: boolean
  }>(),
  {
    loading: false,
    error: undefined,
    empty: false,
    filtered: false,
    canWrite: false,
    arranging: false,
  },
)

const emit = defineEmits<{
  select: [id: number]
  fix: [id: number, field: PointVenteContactField]
  move: [id: number, offset: -1 | 1]
  retry: []
  clear: []
  add: []
}>()

const { t } = useI18n()

const columns = [
  { key: "order", class: "" },
  { key: "counter", class: "" },
  { key: "telephones", class: "hidden md:table-cell" },
  { key: "whatsapp", class: "hidden md:table-cell" },
  { key: "horaires", class: "hidden lg:table-cell" },
  { key: "carte", class: "hidden md:table-cell" },
  { key: "coordonnees", class: "hidden md:table-cell" },
  { key: "active", class: "" },
]
</script>

<template>
  <section data-testid="points-of-sale-table">
    <TaxonomyFlatTableState
      :loading="loading"
      :error="error"
      :empty="empty"
      :filtered="filtered && rows.length === 0"
      :can-write="canWrite"
      :empty-title="t('pointsOfSale.list.empty')"
      :filtered-title="t('pointsOfSale.states.noResults')"
      :add-label="t('pointsOfSale.newPoint')"
      :clear-label="t('pointsOfSale.toolbar.clear')"
      empty-icon="ph:storefront"
      filtered-icon="ph:magnifying-glass"
      @retry="emit('retry')"
      @clear="emit('clear')"
      @add="emit('add')"
    >
      <Table.Root class="text-left" :aria-label="t('pointsOfSale.list.label')">
        <Table.Header>
          <Table.Row>
            <Table.Head v-for="column in columns" :key="column.key" scope="col" :class="column.class">
              {{ t(`pointsOfSale.table.${column.key}`) }}
            </Table.Head>
            <Table.Head v-if="$slots.actions" scope="col">
              <span class="sr-only">{{ t("pointsOfSale.table.actions") }}</span>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <PointsOfSaleTableRow
            v-for="(row, index) in rows"
            :key="row.point.id"
            :point="row.point"
            :position="row.position"
            :can-write="canWrite"
            :arranging="arranging"
            :is-first="index === 0"
            :is-last="index === rows.length - 1"
            @move="offset => emit('move', row.point.id, offset)"
            @select="emit('select', row.point.id)"
            @fix="field => emit('fix', row.point.id, field)"
          >
            <template v-if="$slots.status" #status>
              <slot name="status" :point="row.point" />
            </template>
            <template v-if="$slots.actions" #actions>
              <slot name="actions" :point="row.point" />
            </template>
          </PointsOfSaleTableRow>
        </Table.Body>
      </Table.Root>
    </TaxonomyFlatTableState>
  </section>
</template>
