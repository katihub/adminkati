<script setup lang="ts">
import type { CollectPaymentInput, LieuEncaissement, MoyenEncaissement, StatutCommande } from "@/types/api/commandes"
import type { Role } from "@/types/session"
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
import { useOrderMutations } from "@/composables/useOrderMutations"
import { apiErrorText } from "@/utils/api-error"
import { ORDER_PAYMENT_ACTION_SEVERITY } from "@/utils/order-transition-actions"

const {
  reference,
  remaining,
  roles,
  status,
  inPerimetre = true,
} = defineProps<{
  reference: string
  remaining?: number | null
  roles: readonly Role[]
  status: StatutCommande
  /**
   * False when the order belongs to a counter this member is not attached to.
   * The whole control then disappears: the backend would answer 403, and it would
   * do it after the money has been counted.
   */
  inPerimetre?: boolean
}>()

const emit = defineEmits<{
  completed: []
}>()

const open = defineModel<boolean>("open", { default: false })
const { t } = useI18n()
const amount = ref(remaining && remaining > 0 ? String(remaining) : "")
const moyen = ref<MoyenEncaissement>("especes")
const lieu = ref<LieuEncaissement>("comptoir")
const note = ref("")
const submitError = ref("")
const mutation = useOrderMutations()
const isPending = computed(() => mutation.collectPayment.isPending.value)
const canCollect = computed(
  () => (roles.includes("direction") || roles.includes("comptoir")) && inPerimetre && (remaining ?? 0) > 0,
)
const isPrimary = computed(() => ORDER_PAYMENT_ACTION_SEVERITY[status] === "primary")
const amountText = computed(() => String(amount.value ?? ""))
const amountValue = computed(() => Number(amountText.value))
const isAmountValid = computed(
  () => Number.isInteger(amountValue.value) && amountValue.value > 0 && amountValue.value <= (remaining ?? 0),
)
const noteValue = computed(() => note.value.trim())
const isNoteValid = computed(() => noteValue.value.length === 0 || noteValue.value.length >= 2)
const canSubmit = computed(() => canCollect.value && isAmountValid.value && isNoteValid.value)
const showAmountError = computed(() => amountText.value.trim().length > 0 && !isAmountValid.value)
const showNoteError = computed(() => noteValue.value.length === 1)

watch(open, value => {
  if (value) {
    amount.value = remaining && remaining > 0 ? String(remaining) : ""
    moyen.value = "especes"
    lieu.value = "comptoir"
    note.value = ""
    submitError.value = ""
  }
})

function onConfirm() {
  if (!canSubmit.value) return

  submitError.value = ""
  const input: CollectPaymentInput = {
    montant: amountValue.value,
    moyen: moyen.value,
    lieu: lieu.value,
  }
  if (noteValue.value) input.note = noteValue.value

  mutation.collectPayment.mutate(
    { reference, input },
    {
      onSuccess: () => {
        open.value = false
        emit("completed")
      },
      onError: (error: unknown) => {
        submitError.value = apiErrorText(error, t)
      },
    },
  )
}
</script>

<template>
  <Dialog v-if="canCollect" v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" :variant="isPrimary ? 'default' : 'outline'" data-testid="orders-payment-dialog-trigger">
        <Icon name="ph:money" size="18" aria-hidden="true" />
        {{ t("orders.actions.paymentDialog.trigger") }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="orders-payment-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("orders.actions.paymentDialog.title") }}</DialogTitle>
        <DialogDescription>{{ t("orders.actions.paymentDialog.description", { reference }) }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="orders-payment-dialog-amount">{{ t("orders.actions.paymentDialog.amount") }}</Label>
          <Input
            id="orders-payment-dialog-amount"
            v-model="amount"
            data-testid="orders-payment-dialog-amount"
            type="number"
            min="1"
            :max="remaining ?? undefined"
            step="1"
            inputmode="numeric"
            :disabled="isPending"
          />
          <p v-if="showAmountError" class="text-xs text-destructive" data-testid="orders-payment-dialog-amount-error">
            {{ t("orders.actions.paymentDialog.amountInvalid") }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="orders-payment-dialog-method">{{ t("orders.actions.paymentDialog.method") }}</Label>
          <Select v-model="moyen" :disabled="isPending">
            <SelectTrigger id="orders-payment-dialog-method" data-testid="orders-payment-dialog-method" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="especes">
                  {{ t("orders.actions.paymentDialog.methods.especes") }}
                </SelectItem>
                <SelectItem value="mobile_money">
                  {{ t("orders.actions.paymentDialog.methods.mobile_money") }}
                </SelectItem>
                <SelectItem value="virement">
                  {{ t("orders.actions.paymentDialog.methods.virement") }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="orders-payment-dialog-location">{{ t("orders.actions.paymentDialog.location") }}</Label>
          <Select v-model="lieu" :disabled="isPending">
            <SelectTrigger
              id="orders-payment-dialog-location"
              data-testid="orders-payment-dialog-location"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="comptoir">
                  {{ t("orders.actions.paymentDialog.locations.comptoir") }}
                </SelectItem>
                <SelectItem value="porte">
                  {{ t("orders.actions.paymentDialog.locations.porte") }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="orders-payment-dialog-note">{{ t("orders.actions.paymentDialog.note") }}</Label>
        <Textarea
          id="orders-payment-dialog-note"
          v-model="note"
          data-testid="orders-payment-dialog-note"
          :placeholder="t('orders.actions.paymentDialog.notePlaceholder')"
          maxlength="200"
          :disabled="isPending"
        />
        <p v-if="showNoteError" class="text-xs text-destructive" data-testid="orders-payment-dialog-note-error">
          {{ t("orders.actions.paymentDialog.noteInvalid") }}
        </p>
      </div>

      <p v-if="submitError" data-testid="orders-payment-dialog-error" role="alert" class="text-sm text-destructive">
        {{ submitError }}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isPending" @click="open = false">
          {{ t("orders.actions.paymentDialog.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="orders-payment-dialog-confirm"
          :disabled="isPending || !canSubmit"
          :aria-busy="isPending ? true : undefined"
          @click="onConfirm"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          {{ t("orders.actions.paymentDialog.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
