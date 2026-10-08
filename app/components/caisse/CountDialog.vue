<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCaisseMutations } from "@/composables/useCaisse"
import { apiErrorText } from "@/utils/api-error"
import { CAISSE_ECART_MOTIFS } from "@/utils/caisse-ecart-motifs"

const {
  caisseId,
  variant = "default",
  disabled = false,
  disabledReason = null,
} = defineProps<{
  caisseId: string
  variant?: "default" | "outline"
  disabled?: boolean
  disabledReason?: string | null
}>()

const { t } = useI18n()
const open = ref(false)
/** A mismatched count forces the discrepancy step before the dialog can close — matches the
 *  backend's own validate-time requirement (`compter` opens `litige`, `valider` then refuses
 *  until an `ecartCaisse` row exists), just surfaced immediately instead of on a later attempt. */
const step = ref<"count" | "discrepancy">("count")
/** `Input`/`Textarea`'s `modelValue` is typed `string | number` (a native `type="number"` input
 *  can emit either) — every read below goes through `String(...)` first, matching
 *  `PaymentDialog.vue`'s `amountText` pattern. */
const montantCompte = ref<string | number>("")
const note = ref<string | number>("")
const gapAmount = ref(0)
const motif = ref("")
const commentaire = ref<string | number>("")
const errorMessage = ref("")

const mutation = useCaisseMutations()
const isPending = computed(() => mutation.count.isPending.value || mutation.nameDiscrepancy.isPending.value)

watch(open, isOpen => {
  if (!isOpen) return
  step.value = "count"
  montantCompte.value = ""
  note.value = ""
  motif.value = ""
  commentaire.value = ""
  errorMessage.value = ""
})

const isCountStep = computed(() => step.value === "count")
const countText = computed(() => String(montantCompte.value ?? "").trim())
const countValue = computed(() => Number(countText.value))
const isCountValid = computed(
  () => countText.value !== "" && Number.isInteger(countValue.value) && countValue.value >= 0,
)
const isDiscrepancyValid = computed(() => motif.value.length > 0)
const canSubmit = computed(() => (step.value === "count" ? isCountValid.value : isDiscrepancyValid.value))

function submitCount() {
  errorMessage.value = ""
  const noteText = String(note.value ?? "").trim()
  mutation.count.mutate(
    { id: caisseId, input: { montantCompte: countValue.value, ...(noteText ? { note: noteText } : {}) } },
    {
      onSuccess: result => {
        if (result.ecart !== 0) {
          gapAmount.value = result.ecart ?? 0
          step.value = "discrepancy"
        } else {
          open.value = false
        }
      },
      onError: (error: unknown) => {
        errorMessage.value = apiErrorText(error, t)
      },
    },
  )
}

function submitDiscrepancy() {
  errorMessage.value = ""
  const commentaireText = String(commentaire.value ?? "").trim()
  mutation.nameDiscrepancy.mutate(
    {
      id: caisseId,
      input: {
        montant: Math.abs(gapAmount.value),
        motif: motif.value,
        ...(commentaireText ? { commentaire: commentaireText } : {}),
      },
    },
    {
      onSuccess: () => {
        open.value = false
      },
      onError: (error: unknown) => {
        errorMessage.value = apiErrorText(error, t)
      },
    },
  )
}

function onConfirm() {
  if (!canSubmit.value) return
  if (step.value === "count") submitCount()
  else submitDiscrepancy()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        type="button"
        :variant="variant"
        data-testid="caisse-count-dialog-trigger"
        :disabled="disabled"
        :title="disabled ? (disabledReason ? t(disabledReason) : undefined) : undefined"
      >
        <Icon name="ph:calculator" size="18" aria-hidden="true" />
        {{ t("caisse.detail.countTrigger") }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="caisse-count-dialog-dialog">
      <DialogHeader>
        <DialogTitle>{{
          isCountStep ? t("caisse.detail.countDialog.title") : t("caisse.detail.countDialog.discrepancyTitle")
        }}</DialogTitle>
        <DialogDescription>
          {{
            isCountStep
              ? t("caisse.detail.countDialog.description")
              : t("caisse.detail.countDialog.discrepancyDescription")
          }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="isCountStep" key="count" class="space-y-4">
        <div class="space-y-2">
          <Label for="caisse-count-dialog-amount">{{ t("caisse.detail.countDialog.amount") }}</Label>
          <Input
            id="caisse-count-dialog-amount"
            v-model="montantCompte"
            data-testid="caisse-count-dialog-amount"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            :disabled="isPending"
          />
        </div>
        <div class="space-y-2">
          <Label for="caisse-count-dialog-note">{{ t("caisse.detail.countDialog.note") }}</Label>
          <Textarea
            id="caisse-count-dialog-note"
            v-model="note"
            data-testid="caisse-count-dialog-note"
            maxlength="300"
            :disabled="isPending"
          />
        </div>
      </div>

      <div v-else key="discrepancy" class="space-y-4">
        <div class="space-y-2">
          <Label for="caisse-count-dialog-motif">{{ t("caisse.detail.countDialog.motif") }}</Label>
          <Select v-model="motif" :disabled="isPending">
            <SelectTrigger id="caisse-count-dialog-motif" data-testid="caisse-count-dialog-motif" class="w-full">
              <SelectValue :placeholder="t('caisse.detail.countDialog.motifPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in CAISSE_ECART_MOTIFS" :key="option.value" :value="option.value">
                  {{ t(option.labelKey) }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label for="caisse-count-dialog-commentaire">{{ t("caisse.detail.countDialog.commentaire") }}</Label>
          <Textarea
            id="caisse-count-dialog-commentaire"
            v-model="commentaire"
            data-testid="caisse-count-dialog-commentaire"
            maxlength="300"
            :disabled="isPending"
          />
        </div>
      </div>

      <p v-if="errorMessage" data-testid="caisse-count-dialog-error" role="alert" class="text-sm text-destructive">
        {{ errorMessage }}
      </p>

      <DialogFooter>
        <Button
          v-if="isCountStep"
          type="button"
          variant="outline"
          data-testid="caisse-count-dialog-cancel"
          :disabled="isPending"
          @click="open = false"
        >
          {{ t("caisse.detail.countDialog.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="caisse-count-dialog-confirm"
          :disabled="isPending || !canSubmit"
          :aria-busy="isPending ? true : undefined"
          @click="onConfirm"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          {{ isCountStep ? t("caisse.detail.countDialog.confirm") : t("caisse.detail.countDialog.confirmDiscrepancy") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
