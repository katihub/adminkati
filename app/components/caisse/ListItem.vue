<script setup lang="ts">
import type { CaisseListItem } from "@/types/api/caisse"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { CAISSE_STATUS_TONE } from "@/utils/caisse-status"
import { formatLabelSeau } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

const {
  caisse,
  porteurName,
  selected = false,
} = defineProps<{
  caisse: CaisseListItem
  porteurName: string
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { locale, t } = useI18n()
const formattedAmount = computed(() => formatMontant(caisse.montantAttendu, locale.value))
const dayLabel = computed(() => formatLabelSeau(caisse.journee, "jour", locale.value))
</script>

<template>
  <button
    type="button"
    data-testid="caisse-list-item"
    :data-caisse-id="caisse.id"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', caisse.id)"
  >
    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex items-center justify-between gap-2">
        <span data-testid="caisse-list-item-porteur" class="truncate text-sm font-medium text-foreground">
          {{ porteurName }}
        </span>
        <span class="shrink-0 text-xs font-medium text-foreground" :title="formattedAmount.exact">
          {{ formattedAmount.affiche }}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <Badge
          data-testid="caisse-list-item-status"
          :data-status="caisse.statut"
          class="shrink-0 border-0! rounded-full px-2 py-0 text-[10px] font-medium"
          :class="CAISSE_STATUS_TONE[caisse.statut]"
        >
          {{ t(`caisse.status.${caisse.statut}`) }}
        </Badge>

        <p data-testid="caisse-list-item-day" class="flex items-center line-clamp-1! gap-x-2 text-xs!">
          <Icon name="ph:calendar-dots" aria-hidden="true" />
          {{ dayLabel }}
        </p>
      </div>
    </div>
  </button>
</template>
