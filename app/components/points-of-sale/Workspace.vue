<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteContactField, PointVenteFilter, PointVenteSection } from "@/utils/point-of-sale"
import { PhArrowsDownUp } from "@phosphor-icons/vue"
import { useClipboard } from "@vueuse/core"
import { computed, ref, useTemplateRef } from "vue"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useArrangeOrder } from "@/composables/useArrangeOrder"
import { useCachedSession } from "@/composables/useCachedSession"
import { usePointOfSaleActive } from "@/composables/usePointOfSaleActive"
import { usePointOfSaleDelete } from "@/composables/usePointOfSaleDelete"
import { usePointsVente, usePointVenteMutations } from "@/composables/usePointsVente"
import { apiErrorText } from "@/utils/api-error"
import {
  customerDetailsText,
  filterPoints,
  POINT_VENTE_SECTIONS,
  sectionOfPath,
  sortByIds,
} from "@/utils/point-of-sale"
import { pointOfSaleErrorToast, pointOfSaleToast } from "@/utils/point-of-sale-toast"
import { routeQueryId } from "@/utils/route-query"

const { t } = useI18n()
const route = useRoute()

// Same gate as `GET administration/points-vente`: comptoir reads the counters it gives customers
// over the phone; only direction writes, which the backend enforces on every write route anyway.
const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)

const { data, isPending, error, refetch } = usePointsVente()
/** A non-array success (an outage page, a shape change) reads as "no data", not as a crash. */
const points = computed(() => (Array.isArray(data.value) ? data.value : []))

/** All three chips start present, as on the taxonomy tabs, so none hides behind the "+" menu. */
function neutralFilters(): Filter[] {
  return [
    { field: "q", operator: "contains", value: "" },
    { field: "status", operator: "eq", value: null },
    { field: "details", operator: "eq", value: null },
  ]
}

const filters = ref<Filter[]>(neutralFilters())

/** The toolbar owns the chips; the table only needs their values back as one filter. */
const activeFilter = computed<PointVenteFilter>(() => {
  const value = (field: string) => filters.value.find(filter => filter.field === field)?.value
  const query = value("q")
  const status = value("status")
  const details = value("details")
  return {
    query: typeof query === "string" ? query : "",
    status: status === "active" || status === "inactive" ? status : "all",
    details: details === "complete" || details === "missing" ? details : "all",
  }
})
const hasActiveFilters = computed(
  () =>
    activeFilter.value.query.trim() !== "" ||
    activeFilter.value.status !== "all" ||
    activeFilter.value.details !== "all",
)

function clearFilters() {
  filters.value = neutralFilters()
}

const tableRef = useTemplateRef<HTMLElement>("tableRef")
const arrange = useArrangeOrder(tableRef)
const { reorder } = usePointVenteMutations()
const arrangeAnnouncement = ref("")

const rows = computed(() => {
  if (arrange.draft.value)
    return sortByIds(points.value, arrange.draft.value).map((point, index) => ({ point, position: index + 1 }))
  const visible = new Set(filterPoints(points.value, activeFilter.value).map(point => point.id))
  return points.value.flatMap((point, index) => (visible.has(point.id) ? [{ point, position: index + 1 }] : []))
})

/** A partial list cannot be reordered: the backend takes every id at once. */
const canArrange = computed(
  () => canWrite.value && !hasActiveFilters.value && points.value.length > 1 && !arrange.isArranging.value,
)

function startArranging() {
  arrangeAnnouncement.value = ""
  arrange.start(points.value.map(point => point.id))
}

function moveRow(id: number, offset: -1 | 1) {
  const position = arrange.move(id, offset)
  const point = points.value.find(candidate => candidate.id === id)
  if (position && point)
    arrangeAnnouncement.value = t("pointsOfSale.list.moved", {
      name: point.libelle,
      position,
      total: points.value.length,
    })
}

function sendOrder(ids: number[]) {
  reorder.mutate(ids, {
    onSuccess: () => pointOfSaleToast(t("pointsOfSale.arrange.saved")),
    onError: reorderError =>
      pointOfSaleErrorToast(`${t("pointsOfSale.toast.orderFailed")} ${apiErrorText(reorderError, t)}`, {
        label: t("pointsOfSale.toast.retry"),
        onClick: () => sendOrder(ids),
      }),
    onSettled: () => arrange.stop(),
  })
}

function saveOrder() {
  if (arrange.draft.value) sendOrder(arrange.draft.value)
}

const active = usePointOfSaleActive()
const deletion = usePointOfSaleDelete()
const { copy } = useClipboard({ legacy: true })

async function copyText(text: string) {
  await copy(text)
  pointOfSaleToast(t("pointsOfSale.toast.copied"))
}

function deactivateInstead() {
  const point = deletion.target.value
  if (point)
    active.setActive(point, false, () => {
      deletion.open.value = false
    })
}

function editPoint(point: PointVenteAdmin) {
  openPanel({ point: String(point.id) })
}

const explicitId = computed(() => routeQueryId(route.query.point))
/** `?new` means nothing to a reader: the backend would refuse the creation anyway. */
const isNewMode = computed(() => canWrite.value && explicitId.value === null && route.query.new !== undefined)
const isDrawerOpen = computed(() => explicitId.value !== null || isNewMode.value)

/** No detail endpoint: the drawer reads the row from the list it already holds. */
const selectedPoint = computed(() =>
  explicitId.value === null ? null : (points.value.find(point => point.id === explicitId.value) ?? null),
)

/** Direction lands straight in the form; comptoir reads the same counter without it. */
const drawerMode = computed<"create" | "edit" | "view" | "notFound">(() => {
  if (isNewMode.value) return "create"
  if (!selectedPoint.value) return "notFound"
  return canWrite.value ? "edit" : "view"
})

const drawerSection = computed<PointVenteSection | null>(() => {
  const section = route.query.section
  return POINT_VENTE_SECTIONS.find(candidate => candidate === section) ?? null
})

/** The panel's state lives in the query, next to the tab that `content.vue` keeps there. */
function openPanel(query: Record<string, string>) {
  void navigateTo({ path: route.path, query: { tab: route.query.tab, ...query } })
}

function openAt(id: number, field: PointVenteContactField) {
  openPanel({ point: String(id), section: sectionOfPath(field) ?? "identity" })
}

function onCreated(id: number) {
  openPanel({})
  pointOfSaleToast(t("pointsOfSale.toast.created"), {
    label: t("pointsOfSale.toast.open"),
    onClick: () => openPanel({ point: String(id) }),
  })
}

function onSaved() {
  const name = selectedPoint.value?.libelle ?? ""
  openPanel({})
  pointOfSaleToast(t("pointsOfSale.toast.saved", { name }))
}
</script>

<template>
  <div>
    <div class="sticky top-16 z-10 border-b border-b-muted/70 bg-background px-6">
      <PointsOfSaleToolbar
        v-model:filters="filters"
        :can-write="canWrite && !arrange.isArranging.value"
        :has-active-filters="hasActiveFilters"
        @clear="clearFilters"
        @add="openPanel({ new: '1' })"
      >
        <template #actions>
          <Button
            v-if="canArrange"
            size="sm"
            variant="outline"
            data-testid="points-of-sale-arrange-button"
            @click="startArranging"
          >
            <PhArrowsDownUp :size="16" aria-hidden="true" />
            {{ t("pointsOfSale.arrange.button") }}
          </Button>
        </template>
      </PointsOfSaleToolbar>
      <PointsOfSaleArrangeBar
        v-if="arrange.isArranging.value"
        :changes="arrange.changes.value"
        :saving="reorder.isPending.value"
        :announcement="arrangeAnnouncement"
        @cancel="arrange.stop()"
        @save="saveOrder"
      />
    </div>

    <div ref="tableRef">
      <PointsOfSaleTable
        :rows="rows"
        :loading="isPending && !data"
        :error="error"
        :empty="points.length === 0"
        :filtered="hasActiveFilters"
        :can-write="canWrite && !arrange.isArranging.value"
        :arranging="arrange.isArranging.value"
        @move="moveRow"
        @select="id => openPanel({ point: String(id) })"
        @fix="openAt"
        @retry="() => refetch()"
        @clear="clearFilters"
        @add="openPanel({ new: '1' })"
      >
        <template v-if="canWrite && !arrange.isArranging.value" #status="{ point }">
          <label class="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              data-testid="points-of-sale-row-active"
              :model-value="point.active"
              :disabled="active.pendingId.value === point.id"
              :aria-busy="active.pendingId.value === point.id || undefined"
              :aria-label="t('pointsOfSale.table.activeLabel', { name: point.libelle })"
              @update:model-value="(value: boolean) => active.setActive(point, value)"
            />
            {{ t(point.active ? "pointsOfSale.table.shown" : "pointsOfSale.table.hidden") }}
          </label>
        </template>
        <template v-if="canWrite && !arrange.isArranging.value" #actions="{ point }">
          <PointsOfSaleRowMenu
            :point="point"
            @edit="editPoint(point)"
            @toggle="active.setActive(point, !point.active)"
            @copy-key="copyText(point.cle)"
            @copy-details="copyText(customerDetailsText(point))"
            @remove="deletion.ask(point)"
          />
        </template>
      </PointsOfSaleTable>
    </div>

    <PointsOfSaleDeleteDialog
      v-model:open="deletion.open.value"
      :point="deletion.target.value"
      :delete-pending="deletion.isPending.value"
      :deactivate-pending="active.isPending.value"
      :error="deletion.error.value"
      :refused="deletion.refused.value"
      @confirm="deletion.confirm"
      @deactivate="deactivateInstead"
    />

    <PointsOfSaleDrawer
      :open="isDrawerOpen && !(drawerMode === 'notFound' && isPending)"
      :point="selectedPoint"
      :mode="drawerMode"
      :section="drawerSection"
      :next-position="points.length + 1"
      @close="openPanel({})"
      @created="onCreated"
      @saved="onSaved"
    />
  </div>
</template>
