<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { bpsFromPercent, percentFromBps } from "@/utils/commission"

/**
 * A seller's commission rate. The direction can change it with a reason kept in the journal;
 * every ordered line copies the rate when it is ordered, so the change applies to future orders only.
 */
const { sellerId, commissionBps, canEdit } = defineProps<{
  sellerId: string
  commissionBps: number
  canEdit: boolean
}>()
const { t } = useI18n({ useScope: "local" })
const apiWrite = useApiWrite()
const queryClient = useQueryClient()
const editing = ref(false)
const percent = ref("")
const reason = ref("")
const newBps = computed(() => bpsFromPercent(percent.value))
const valid = computed(() => newBps.value !== null && newBps.value !== commissionBps && reason.value.trim().length >= 5)
const save = useMutation({
  mutationFn: (body: { commissionBps: number; motif: string }) =>
    apiWrite(`/vendeurs/${encodeURIComponent(sellerId)}/commission`, { method: "POST", body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.seller(sellerId) }),
})

function open() {
  percent.value = percentFromBps(commissionBps)
  reason.value = ""
  editing.value = true
}

async function confirm() {
  if (!valid.value || newBps.value === null) return
  try {
    await save.mutateAsync({ commissionBps: newBps.value, motif: reason.value.trim() })
    toast.success(t("saved", { rate: percentFromBps(newBps.value) }))
    editing.value = false
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <div>
    <dt class="text-xs text-muted-foreground">{{ t("commission") }}</dt>
    <dd class="flex flex-wrap items-center gap-2">
      <span data-testid="seller-commission-rate">{{ percentFromBps(commissionBps) }} %</span>
      <Button
        v-if="canEdit"
        size="sm"
        variant="outline"
        class="h-7 px-2"
        data-testid="seller-commission-edit"
        @click="open"
        >{{ t("edit") }}</Button
      >
    </dd>

    <Dialog :open="editing" @update:open="value => (editing = value)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t("title") }}</DialogTitle>
          <DialogDescription>{{ t("help") }}</DialogDescription>
        </DialogHeader>
        <form class="flex flex-col gap-3" @submit.prevent="confirm">
          <Label :for="`commission-${sellerId}`">{{ t("rate") }}</Label>
          <Input
            :id="`commission-${sellerId}`"
            v-model="percent"
            inputmode="decimal"
            data-testid="seller-commission-input"
          />
          <Label :for="`commission-reason-${sellerId}`">{{ t("reason") }}</Label>
          <Textarea
            :id="`commission-reason-${sellerId}`"
            v-model="reason"
            rows="3"
            maxlength="500"
            data-testid="seller-commission-reason"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" @click="editing = false">{{ t("cancel") }}</Button>
            <Button type="submit" :disabled="!valid || save.isPending.value" data-testid="seller-commission-confirm">{{
              t("confirm")
            }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "commission": "Commission rate",
    "edit": "Edit",
    "title": "Change the commission rate",
    "help": "The new rate applies to new orders only: orders already placed keep their rate. The reason is kept in the journal.",
    "rate": "New rate (%, from 0 to 100)",
    "reason": "Reason (5 characters minimum)",
    "cancel": "Cancel",
    "confirm": "Save the rate",
    "saved": "Commission rate set to {rate} %."
  },
  "fr": {
    "commission": "Taux de commission",
    "edit": "Modifier",
    "title": "Modifier le taux de commission",
    "help": "Le nouveau taux s’applique aux nouvelles commandes uniquement : les commandes déjà passées gardent leur taux. Le motif est conservé au journal.",
    "rate": "Nouveau taux (%, de 0 à 100)",
    "reason": "Motif (5 caractères minimum)",
    "cancel": "Annuler",
    "confirm": "Enregistrer le taux",
    "saved": "Taux de commission fixé à {rate} %."
  }
}
</i18n>
