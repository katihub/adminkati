<script setup lang="ts">
import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDeliveryIntervalLabel } from "@/composables/useDeliveryIntervalLabel"

const { option, busy = false } = defineProps<{
  option: DelaiLivraison
  busy?: boolean
}>()
const emit = defineEmits<{
  edit: []
  archive: []
  restore: []
}>()

const { t } = useI18n()
const intervalLabel = useDeliveryIntervalLabel()
</script>

<template>
  <li
    :data-testid="`delivery-manage-row-${option.id}`"
    class="flex items-center gap-3 rounded-2xl border border-border px-3 py-2"
    :class="{ 'opacity-60': !option.actif }"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-foreground">{{ intervalLabel(option) }}</span>
        <Badge v-if="option.est_defaut">
          {{ t("products.delivery.default") }}
        </Badge>
        <Badge v-if="!option.actif" variant="secondary">
          {{ t("products.delivery.manage.archived") }}
        </Badge>
      </div>
      <p v-if="option.utilise_par > 0" class="text-xs text-muted-foreground">
        {{ t("products.delivery.manage.inUse", { count: option.utilise_par }, option.utilise_par) }}
      </p>
    </div>

    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      :data-testid="`delivery-manage-edit-${option.id}`"
      :aria-label="t('products.delivery.manage.edit', { label: intervalLabel(option) })"
      :disabled="busy"
      @click="emit('edit')"
    >
      <Icon name="ph:pencil-simple" aria-hidden="true" />
    </Button>
    <Button
      v-if="!option.actif"
      type="button"
      variant="outline"
      size="sm"
      :data-testid="`delivery-manage-restore-${option.id}`"
      :aria-label="t('products.delivery.manage.restore', { label: intervalLabel(option) })"
      :disabled="busy"
      @click="emit('restore')"
    >
      <Icon name="ph:arrow-counter-clockwise" aria-hidden="true" />
    </Button>
    <Button
      v-else-if="!option.est_defaut"
      type="button"
      variant="ghost"
      size="icon-sm"
      :data-testid="`delivery-manage-archive-${option.id}`"
      :aria-label="t('products.delivery.manage.archive', { label: intervalLabel(option) })"
      :disabled="busy"
      @click="emit('archive')"
    >
      <Icon name="ph:archive" aria-hidden="true" />
    </Button>
  </li>
</template>
