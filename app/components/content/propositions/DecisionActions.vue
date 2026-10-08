<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"
import { ref, watch } from "vue"
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const { proposal, canWrite, isAccepting, isRefusing } = defineProps<{
  proposal: CatalogueProposal
  canWrite: boolean
  isAccepting: boolean
  isRefusing: boolean
}>()

const emit = defineEmits<{
  accept: []
  refuse: [motif: string]
}>()

const { t } = useI18n()
const acceptOpen = ref(false)
const refuseOpen = ref(false)
const motif = ref("")

function submitRefusal() {
  const value = motif.value.trim()
  if (!value) return
  emit("refuse", value)
  refuseOpen.value = false
}

watch(
  () => proposal.id,
  () => {
    motif.value = ""
  },
)
</script>

<template>
  <div
    v-if="proposal.statut === 'en_attente' && canWrite"
    class="flex flex-wrap items-center justify-end gap-2"
    data-testid="proposal-decision-actions"
  >
    <Button
      type="button"
      variant="outline"
      data-testid="proposal-refuse-trigger"
      :disabled="isAccepting || isRefusing"
      @click="refuseOpen = true"
    >
      {{ t("content.propositions.actions.refuse") }}
    </Button>
    <Button
      type="button"
      data-testid="proposal-accept-trigger"
      :disabled="isAccepting || isRefusing"
      @click="acceptOpen = true"
    >
      {{ t("content.propositions.actions.accept") }}
    </Button>
  </div>

  <p
    v-else-if="proposal.statut === 'en_attente'"
    class="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
    data-testid="proposal-read-only"
  >
    {{ t("content.propositions.detail.readOnly") }}
  </p>

  <AlertDialog v-model:open="acceptOpen">
    <AlertDialogContent data-testid="proposal-accept-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("content.propositions.accept.title") }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          t("content.propositions.accept.description", {
            name: proposal.nom,
            count: Object.keys(proposal.champs).length,
          })
        }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isAccepting">
          {{ t("content.propositions.actions.cancel") }}
        </AlertDialogCancel>
        <AlertDialogAction data-testid="proposal-accept-confirm" :disabled="isAccepting" @click="emit('accept')">
          {{ t("content.propositions.actions.accept") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Dialog v-model:open="refuseOpen">
    <DialogContent data-testid="proposal-refuse-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("content.propositions.refuse.title") }}</DialogTitle>
        <DialogDescription>{{ t("content.propositions.refuse.description") }}</DialogDescription>
      </DialogHeader>
      <Textarea
        v-model="motif"
        data-testid="proposal-refuse-input"
        maxlength="500"
        :placeholder="t('content.propositions.refuse.placeholder')"
      />
      <DialogFooter>
        <DialogClose as-child>
          <Button type="button" variant="outline" :disabled="isRefusing">
            {{ t("content.propositions.actions.cancel") }}
          </Button>
        </DialogClose>
        <Button
          type="button"
          data-testid="proposal-refuse-confirm"
          :disabled="isRefusing || !motif.trim()"
          @click="submitRefusal"
        >
          {{ t("content.propositions.actions.refuse") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
