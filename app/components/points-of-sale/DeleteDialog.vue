<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
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

const { point, deletePending, deactivatePending, error, refused } = defineProps<{
  point: PointVenteAdmin | null
  deletePending: boolean
  deactivatePending: boolean
  error: string
  /** A 409: the counter is still referenced, so retrying cannot succeed — deactivating can. */
  refused: boolean
}>()

const emit = defineEmits<{
  confirm: []
  deactivate: []
}>()

const open = defineModel<boolean>("open", { required: true })

const { t } = useI18n()

function refusalCopy() {
  return {
    icon: "ph:lock-simple",
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    title: t("pointsOfSale.delete.refusedTitle", { name: point?.libelle ?? "" }),
    description: t("pointsOfSale.delete.refusedDescription"),
  }
}

function confirmationCopy() {
  return {
    icon: "ph:trash",
    iconClass: "bg-destructive/10 text-destructive",
    title: t("pointsOfSale.delete.title", { name: point?.libelle ?? "" }),
    description: t("pointsOfSale.panel.deleteConfirmDescription"),
  }
}

/** A refusal turns the same dialog into its fix: what blocks the deletion, and the way out. */
const copy = computed(() => (refused ? refusalCopy() : confirmationCopy()))

const offersDeactivation = computed(() => refused && (point?.active ?? false))
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent data-testid="points-of-sale-delete-dialog" class="sm:max-w-md">
      <AlertDialogHeader class="items-center text-center">
        <span
          class="mb-1 flex size-11 items-center justify-center rounded-full"
          :class="copy.iconClass"
          aria-hidden="true"
        >
          <Icon :name="copy.icon" size="20" />
        </span>
        <AlertDialogTitle>{{ copy.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ copy.description }}</AlertDialogDescription>
      </AlertDialogHeader>

      <p
        v-if="error"
        data-testid="points-of-sale-delete-error"
        role="alert"
        class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {{ error }}
      </p>

      <AlertDialogFooter class="sm:grid sm:grid-cols-2">
        <AlertDialogCancel data-testid="points-of-sale-delete-cancel" :disabled="deletePending || deactivatePending">
          {{ t("pointsOfSale.panel.deleteCancel") }}
        </AlertDialogCancel>
        <Button
          v-if="offersDeactivation"
          type="button"
          data-testid="points-of-sale-deactivate-instead"
          :disabled="deactivatePending"
          :aria-busy="deactivatePending || undefined"
          @click="emit('deactivate')"
        >
          <Spinner v-if="deactivatePending" data-icon="inline-start" />
          {{ t("pointsOfSale.panel.deactivateInstead") }}
        </Button>
        <Button
          v-else
          type="button"
          variant="destructive"
          data-testid="points-of-sale-delete-confirm"
          :disabled="deletePending || refused"
          :aria-busy="deletePending || undefined"
          @click="emit('confirm')"
        >
          <Spinner v-if="deletePending" data-icon="inline-start" />
          {{ t("pointsOfSale.panel.deleteConfirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
