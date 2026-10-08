<script setup lang="ts">
import type { StatutForce } from "@/types/api/inventaire"
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

/** Explains what handing the status back to WooCommerce drops, then waits for the operator's confirmation. */
const { currentStatus } = defineProps<{
  /** The status set in the panel, which the dialog names as the one being given up. */
  currentStatus: StatutForce
}>()

const emit = defineEmits<{ confirm: [] }>()

const open = defineModel<boolean>("open", { required: true })

const { t } = useI18n()
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent data-testid="follow-catalogue-dialog" class="sm:max-w-md">
      <AlertDialogHeader class="items-center text-center">
        <span
          class="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-foreground"
          aria-hidden="true"
        >
          <Icon name="ph:cloud-arrow-down" size="20" />
        </span>
        <AlertDialogTitle>{{ t("products.inventory.followCatalogue.title") }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{
            t("products.inventory.followCatalogue.description", {
              status: t(
                currentStatus === "en_stock"
                  ? "products.overview.stockIndicator.label"
                  : "products.overview.stockIndicator.outOfStock",
              ),
            })
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter class="sm:grid sm:grid-cols-2">
        <AlertDialogCancel data-testid="follow-catalogue-cancel">
          {{ t("products.inventory.cancel") }}
        </AlertDialogCancel>
        <Button type="button" data-testid="follow-catalogue-confirm" @click="emit('confirm')">
          {{ t("products.inventory.followCatalogue.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
