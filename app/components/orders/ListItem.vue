<script setup lang="ts">
import type { CommandeAnnuaireItem } from "@/types/api/commandes"
import type { Comptoir } from "@/types/api/vitrine"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { comptoirLabel } from "@/utils/comptoirs"
// import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"
import { ORDER_STATUS_TONE } from "@/utils/order-status"

const {
  order,
  comptoirs = [],
  selected = false,
} = defineProps<{
  order: CommandeAnnuaireItem
  comptoirs?: Comptoir[]
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [reference: string]
}>()

const { locale, t } = useI18n()

const amount = computed(() => order.totalFacturableTtc ?? order.totalFermeTtc ?? order.totalEstimeTtc)
const formattedAmount = computed(() => (amount.value === undefined ? null : formatMontant(amount.value, locale.value)))
/** Sans comptoir, la commande part à domicile ; le dire vaut mieux qu'un blanc. */
const comptoirText = computed(() =>
  order.comptoir ? comptoirLabel(comptoirs, order.comptoir) : t("orders.detail.noCounter"),
)
</script>

<template>
  <button
    type="button"
    data-testid="orders-list-item"
    :data-order-reference="order.reference"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 py-3 px-4 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', order.reference)"
  >
    <!-- <div
      data-testid="orders-list-item-thumbnail"
      class="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/70 text-muted-foreground shadow-2xs"
    >
      <Icon name="ph:receipt" size="18" aria-hidden="true" />
    </div> -->

    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex items-center justify-between gap-2">
        <span data-testid="orders-list-item-reference" class="truncate font-medium text-sm text-foreground">
          {{ order.reference }}
        </span>
        <span
          v-if="formattedAmount"
          class="shrink-0 text-xs font-medium text-foreground"
          :title="formattedAmount.exact"
        >
          {{ formattedAmount.affiche }}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <Badge
          data-testid="orders-list-item-status"
          :data-status="order.statut"
          class="shrink-0 border-0! rounded-full px-2 py-0 text-[10px] font-medium"
          :class="ORDER_STATUS_TONE[order.statut]"
        >
          {{ t(`orders.status.${order.statut}`) }}
        </Badge>

        <p class="flex items-center line-clamp-1! gap-x-2 text-xs!">
          <Icon name="ph:package" aria-hidden="true" />
          {{ t("orders.listPanel.itemCount", { count: order.ligneCount }) }}
        </p>
      </div>

      <p
        class="flex items-center gap-x-1 truncate text-[11px] text-muted-foreground"
        data-testid="orders-list-item-comptoir"
        :data-comptoir="order.comptoir ?? ''"
      >
        <Icon :name="order.comptoir ? 'ph:storefront' : 'ph:house'" aria-hidden="true" />
        {{ comptoirText }}
      </p>
    </div>
  </button>
</template>
