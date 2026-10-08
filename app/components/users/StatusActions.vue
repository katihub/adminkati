<script setup lang="ts">
import type { CustomerStatus } from "@/types/api/clients"
import { computed, ref } from "vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const {
  status,
  name,
  pending = false,
} = defineProps<{
  status: CustomerStatus
  name: string
  pending?: boolean
}>()

const emit = defineEmits<{
  suspend: []
  reactivate: []
}>()

const { t } = useI18n()
const suspendOpen = ref(false)
const reactivateOpen = ref(false)

/**
 * `supprime` n'a pas de bouton : le backend ne connaît que le couple
 * actif/suspendu (`changerStatut(id, 'actif' | 'suspendu')`), et proposer
 * « réactiver » sur un compte supprimé laisserait croire qu'une suppression se
 * défait depuis ici.
 */
const canSuspend = computed(() => status === "actif")
const canReactivate = computed(() => status === "suspendu")

function confirmSuspend() {
  suspendOpen.value = false
  emit("suspend")
}

function confirmReactivate() {
  reactivateOpen.value = false
  emit("reactivate")
}
</script>

<template>
  <div data-testid="users-status-actions" class="flex flex-wrap items-center justify-end gap-2">
    <AlertDialog v-if="canSuspend" :open="suspendOpen" @update:open="suspendOpen = $event">
      <AlertDialogContent data-testid="users-suspend-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("users.suspend.title", { name }) }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("users.suspend.description") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">
            {{ t("users.suspend.cancel") }}
          </AlertDialogCancel>
          <AlertDialogAction :disabled="pending" data-testid="users-suspend-confirm" @click="confirmSuspend">
            {{ t("users.suspend.confirm") }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-if="canReactivate" :open="reactivateOpen" @update:open="reactivateOpen = $event">
      <AlertDialogContent data-testid="users-reactivate-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("users.reactivate.title", { name }) }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("users.reactivate.description") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">
            {{ t("users.reactivate.cancel") }}
          </AlertDialogCancel>
          <AlertDialogAction :disabled="pending" data-testid="users-reactivate-confirm" @click="confirmReactivate">
            {{ t("users.reactivate.confirm") }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Button
      v-if="canSuspend"
      type="button"
      variant="outline"
      :disabled="pending"
      data-testid="users-suspend-button"
      @click="suspendOpen = true"
    >
      {{ t("users.actions.suspend") }}
    </Button>
    <Button
      v-if="canReactivate"
      type="button"
      :disabled="pending"
      data-testid="users-reactivate-button"
      @click="reactivateOpen = true"
    >
      {{ t("users.actions.reactivate") }}
    </Button>
  </div>
</template>
