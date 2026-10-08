<script setup lang="ts">
import { useId } from "vue"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"

const { title, status, pending, isSaving } = defineProps<{
  title: string
  status: string
  /** Amber while something is not saved yet. */
  pending: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()

const active = defineModel<boolean>("active", { required: true })

const { t } = useI18n()
const activeLabelId = useId()
</script>

<template>
  <SheetHeader class="gap-3 border-b border-border px-8 py-5 @3xl:flex-row @3xl:items-center">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <SheetTitle data-testid="points-of-sale-drawer-title" class="truncate text-xl font-semibold tracking-tight">
        {{ title }}
      </SheetTitle>
      <SheetDescription
        class="flex items-center gap-2 text-sm"
        :class="pending ? 'text-amber-700 dark:text-amber-400' : ''"
      >
        <span v-if="pending" class="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
        <span data-testid="points-of-sale-drawer-status">{{ status }}</span>
      </SheetDescription>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <Switch
          v-model="active"
          data-testid="points-of-sale-form-active"
          :aria-labelledby="activeLabelId"
          :disabled="isSaving"
        />
        <span :id="activeLabelId" class="text-sm text-muted-foreground">{{ t("pointsOfSale.drawer.publish") }}</span>
      </div>
      <span class="hidden h-7 w-px bg-border @3xl:block" aria-hidden="true" />
      <Button variant="outline" data-testid="points-of-sale-drawer-cancel" :disabled="isSaving" @click="emit('cancel')">
        {{ t("pointsOfSale.form.cancel") }}
      </Button>
    </div>
  </SheetHeader>
</template>
