<script setup lang="ts">
import type { AvailabilityConflict } from "@/utils/stock-availability"
import { computed } from "vue"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const { conflict, quantity } = defineProps<{
  /** What the chosen status contradicts; `null` while the dialog is closed. */
  conflict: AvailabilityConflict | null
  /** The count on record, which the warning quotes. */
  quantity: number
}>()

const emit = defineEmits<{ confirm: [] }>()

const open = defineModel<boolean>("open", { required: true })

const { locale, t } = useI18n()

const copy = computed(() => {
  const count = new Intl.NumberFormat(locale.value).format(quantity)
  if (conflict === "sell-without-stock") {
    return {
      title: t("products.availability.conflict.sellWithoutStock.title"),
      description: t("products.availability.conflict.sellWithoutStock.description", { quantity: count }),
    }
  }
  if (conflict === "hide-with-stock") {
    return {
      title: t("products.availability.conflict.hideWithStock.title"),
      description: t("products.availability.conflict.hideWithStock.description", { quantity: count }),
    }
  }
  if (conflict === "resume-flips") {
    const outcome = t(
      quantity > 0 ? "products.availability.outcome.inStock" : "products.availability.outcome.outOfStock",
    )
    return {
      title: t("products.availability.conflict.resumeFlips.title"),
      description: t("products.availability.conflict.resumeFlips.description", { quantity: count, outcome }),
    }
  }
  return { title: "", description: "" }
})
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent data-testid="stock-conflict-dialog" class="sm:max-w-md">
      <AlertDialogHeader class="items-center text-center">
        <span
          class="mb-1 flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning"
          aria-hidden="true"
        >
          <Icon name="ph:warning" size="20" />
        </span>
        <AlertDialogTitle>{{ copy.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ copy.description }}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter class="sm:grid sm:grid-cols-2">
        <AlertDialogCancel data-testid="stock-conflict-cancel">
          {{ t("products.availability.conflict.cancel") }}
        </AlertDialogCancel>
        <Button type="button" data-testid="stock-conflict-confirm" @click="emit('confirm')">
          {{ t("products.availability.conflict.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
