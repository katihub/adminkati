<script setup lang="ts">
import { useId } from "vue"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

defineProps<{ checked: boolean }>()
defineEmits<{ "update:checked": [value: boolean] }>()
const { t } = useI18n()
const switchId = useId()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg bg-warning/10 p-3 text-warning">
    <p role="status" class="flex items-start gap-2 text-xs font-medium" data-testid="stock-import-changed-notice">
      <Icon name="ph:clock-counter-clockwise" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
      {{ t(checked ? "products.stockImport.stockChanged.noticeIncluded" : "products.stockImport.stockChanged.notice") }}
    </p>
    <div class="flex items-start gap-3">
      <Switch
        :id="switchId"
        :model-value="checked"
        data-testid="stock-import-include-changed"
        class="mt-0.5"
        @update:model-value="$emit('update:checked', $event)"
      />
      <div class="flex flex-col gap-0.5">
        <Label :for="switchId" class="text-sm text-foreground">{{
          t("products.stockImport.stockChanged.include")
        }}</Label>
        <p class="text-xs text-muted-foreground">{{ t("products.stockImport.stockChanged.includeHint") }}</p>
      </div>
    </div>
  </div>
</template>
