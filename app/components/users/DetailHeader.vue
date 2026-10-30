<script setup lang="ts">
import type { CustomerStatus } from "@/types/api/clients"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  name: string
  status: CustomerStatus
}>()

const emit = defineEmits<{ back: [] }>()
const { t } = useI18n()

const STATUS_TONE: Record<CustomerStatus, string> = {
  actif: "bg-primary/10 text-primary",
  suspendu: "bg-warning/10 text-warning-foreground",
  supprime: "bg-muted text-muted-foreground",
}
</script>

<template>
  <header
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
    data-testid="users-detail-header"
  >
    <div class="flex min-w-0 items-center gap-2">
      <Button variant="ghost" size="icon-sm" class="lg:hidden" data-testid="users-detail-back" @click="emit('back')">
        <Icon name="ph:arrow-left" size="16" aria-hidden="true" />
        <span class="sr-only">{{ t("users.page.back") }}</span>
      </Button>
      <h2
        class="truncate font-heading text-lg font-semibold tracking-tight text-foreground"
        data-testid="users-detail-name"
      >
        {{ props.name }}
      </h2>
      <Badge
        data-testid="users-detail-status"
        class="rounded-full border-0! px-2.5 py-0.5 text-xs font-medium"
        :class="STATUS_TONE[props.status]"
      >
        {{ t(`users.listItem.status.${props.status}`) }}
      </Badge>
    </div>
    <div class="order-3 w-full overflow-x-auto">
      <slot name="tabs" />
    </div>
    <div
      v-if="$slots.actions"
      class="flex min-w-0 flex-wrap items-center justify-end gap-2"
      data-testid="users-detail-actions"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
