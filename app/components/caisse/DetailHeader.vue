<script setup lang="ts">
import type { CaisseDetail } from "@/types/api/caisse"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { CAISSE_STATUS_TONE } from "@/utils/caisse-status"
import { formatLabelSeau } from "@/utils/dates"

const { caisse, porteurName } = defineProps<{
  caisse: CaisseDetail
  porteurName: string
}>()

const { locale, t } = useI18n()
const dayLabel = computed(() => formatLabelSeau(caisse.journee, "jour", locale.value))
</script>

<template>
  <header
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
    data-testid="caisse-detail-header"
  >
    <div class="flex min-w-0 items-center gap-2">
      <h2
        class="truncate font-heading text-lg font-semibold tracking-tight text-foreground"
        data-testid="caisse-detail-porteur"
      >
        {{ porteurName }}
      </h2>
      <span data-testid="caisse-detail-day" class="text-sm text-muted-foreground">{{ dayLabel }}</span>
      <Badge
        data-testid="caisse-detail-status"
        :data-status="caisse.statut"
        class="border-0! rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="CAISSE_STATUS_TONE[caisse.statut]"
      >
        {{ t(`caisse.status.${caisse.statut}`) }}
      </Badge>
    </div>

    <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
