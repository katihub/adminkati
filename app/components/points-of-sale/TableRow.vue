<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteContactField } from "@/utils/point-of-sale"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"
import { mapLink, missingContactFields } from "@/utils/point-of-sale"

const {
  point,
  position,
  canWrite,
  arranging = false,
  isFirst = false,
  isLast = false,
} = defineProps<{
  point: PointVenteAdmin
  position: number
  canWrite: boolean
  arranging?: boolean
  isFirst?: boolean
  isLast?: boolean
}>()

const emit = defineEmits<{
  select: []
  fix: [field: PointVenteContactField]
  move: [offset: -1 | 1]
}>()

const { t } = useI18n()

interface DetailCell {
  field: PointVenteContactField
  class: string
  text: string
  href?: string | null
  extra?: string
  missing: boolean
}

function telephoneCell(missing: Set<PointVenteContactField>): DetailCell {
  const extraNumbers = point.telephones.length - 1
  return {
    field: "telephones" as const,
    class: "md:table-cell tabular-nums whitespace-nowrap",
    text: point.telephones[0]?.numero ?? "",
    extra: extraNumbers > 0 ? t("pointsOfSale.table.more", { count: extraNumbers }) : "",
    missing: missing.has("telephones"),
  }
}

function coordinateCell(missing: Set<PointVenteContactField>): DetailCell {
  const hasCoordinates = point.latitude !== null && point.longitude !== null
  return {
    field: "coordonnees" as const,
    class: "md:table-cell",
    text: t("pointsOfSale.table.pin"),
    href: hasCoordinates ? mapLink(point.latitude!, point.longitude!) : null,
    missing: missing.has("coordonnees"),
  }
}

/** One cell per published detail, in the table's column order. */
const cells = computed<DetailCell[]>(() => {
  const missing = new Set(missingContactFields(point))
  return [
    telephoneCell(missing),
    {
      field: "whatsapp" as const,
      class: "md:table-cell text-xs font-semibold text-primary",
      text: t("pointsOfSale.table.yes"),
      missing: missing.has("whatsapp"),
    },
    {
      field: "horaires" as const,
      class: "lg:table-cell text-muted-foreground",
      text: point.horaires ?? "",
      missing: missing.has("horaires"),
    },
    {
      field: "carte" as const,
      class: "md:table-cell",
      text: t("pointsOfSale.table.open"),
      href: point.carte,
      missing: missing.has("carte"),
    },
    coordinateCell(missing),
  ]
})

function onRowClick() {
  if (!arranging) emit("select")
}
</script>

<template>
  <Table.Row
    data-testid="points-of-sale-row"
    :data-id="point.id"
    :class="arranging ? '' : 'cursor-pointer'"
    @click="onRowClick"
  >
    <Table.Cell class="w-20 rounded-l-lg py-3">
      <PointsOfSaleMoveButtons
        v-if="arranging"
        :id="point.id"
        :name="point.libelle"
        :is-first="isFirst"
        :is-last="isLast"
        @move="offset => emit('move', offset)"
      />
      <Badge v-else variant="secondary" class="rounded-full px-2.5 py-0.5 font-mono text-xs">
        {{ position }}
      </Badge>
    </Table.Cell>

    <Table.Cell class="py-3">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground"
        >
          <Icon name="ph:storefront" size="18" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <button
            type="button"
            data-testid="points-of-sale-row-name"
            class="block max-w-full truncate rounded-sm text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :class="point.active ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{ point.libelle }}
          </button>
          <p class="truncate text-xs text-muted-foreground">{{ point.quartier }}, {{ point.ville }}</p>
        </div>
      </div>
    </Table.Cell>

    <Table.Cell v-for="cell in cells" :key="cell.field" class="hidden py-3" :class="cell.class" @click.stop>
      <PointsOfSaleDetailCell
        :field="cell.field"
        :name="point.libelle"
        :can-write="canWrite"
        :missing="cell.missing"
        :text="cell.text"
        :href="cell.href"
        :extra="cell.extra"
        @fix="emit('fix', cell.field)"
      />
    </Table.Cell>

    <Table.Cell class="py-3" :class="$slots.actions ? '' : 'rounded-r-lg'" @click.stop>
      <slot name="status">
        <Badge :variant="point.active ? 'default' : 'secondary'">
          {{ t(point.active ? "pointsOfSale.status.active" : "pointsOfSale.status.inactive") }}
        </Badge>
      </slot>
    </Table.Cell>

    <Table.Cell v-if="$slots.actions" class="w-12 rounded-r-lg py-3" @click.stop>
      <slot name="actions" />
    </Table.Cell>
  </Table.Row>
</template>
