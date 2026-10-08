<script setup lang="ts">
import type { AdvanceOrderInput, ModeRemise, MotifCloture, StatutCommande } from "@/types/api/commandes"
import type { ConfirmConflict } from "@/utils/order-confirm-conflict"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useOrderMutations } from "@/composables/useOrderMutations"
import { apiErrorText } from "@/utils/api-error"
import { parseConfirmConflict } from "@/utils/order-confirm-conflict"

const { reference, transition, modeRemise, confirmeParClient, recuLe, productNames } = defineProps<{
  reference: string
  transition: StatutCommande
  /** `domicile` is the only remise that needs a courier named before it leaves. */
  modeRemise: ModeRemise
  /** Whether the CUSTOMER said they received it — decides which closure motives the base will accept. */
  confirmeParClient: boolean
  recuLe: string | null
  productNames?: Record<string, string>
}>()

const emit = defineEmits<{
  completed: []
}>()

const open = defineModel<boolean>("open", { default: false })
const { t } = useI18n()
const motif = ref("")
const motifCloture = ref<MotifCloture>()
const livreurId = ref<string>()
const submitError = ref("")
const mutation = useOrderMutations()
/* Soumise -> confirmee has its own endpoint: it reserves stock AND freezes the
   prices, which the generic advance route does not. */
const isConfirmation = computed(() => transition === "confirmee")
const isPending = computed(() => mutation.advance.isPending.value || mutation.confirm.isPending.value)
const conflict = ref<ConfirmConflict>()
const requiresClosureReason = computed(() => transition === "close")
/* A courier is named when the goods go out the door, and only then. A pickup
   or an agency shipment has no round to hand over. */
const requiresLivreur = computed(() => transition === "en_remise" && modeRemise === "domicile")
const canSubmit = computed(
  () =>
    (!requiresClosureReason.value || Boolean(motifCloture.value)) &&
    (!requiresLivreur.value || Boolean(livreurId.value)),
)
const targetLabel = computed(() => t(`orders.actions.transition.${transition}`))
/* Interpolé plutôt que conditionnel dans le message : une date absente ne doit
   pas laisser « reçu le . » dans la phrase. */
const dateReception = computed(() => (recuLe ? ` le ${new Date(recuLe).toLocaleDateString()}` : ""))

const closureMotives: MotifCloture[] = [
  "livree",
  "livree_partielle",
  "retiree",
  "sans_preuve",
  "echec_livraison",
  "expiree_retrait",
]
/* THE BASE DECIDES, AND IT DECIDES BOTH WAYS. `livree`/`retiree` need the
   customer's confirmation; `sans_preuve`/`echec_livraison` are refused once
   that confirmation exists. Showing which motives are live — rather than
   letting the operator pick one and read a 409 — is the whole point of
   carrying `confirmeParClient` into this dialog. */
const MOTIFS_AVEC_REMISE: MotifCloture[] = ["livree", "livree_partielle", "retiree"]
function motifRefuse(option: MotifCloture) {
  return confirmeParClient ? !MOTIFS_AVEC_REMISE.includes(option) : MOTIFS_AVEC_REMISE.includes(option)
}

watch(open, value => {
  if (value) {
    motif.value = ""
    motifCloture.value = undefined
    livreurId.value = undefined
    submitError.value = ""
    conflict.value = undefined
  }
})

function onSuccess() {
  open.value = false
  emit("completed")
}

function onError(error: unknown) {
  conflict.value = parseConfirmConflict(error)
  submitError.value = conflict.value ? "" : apiErrorText(error, t)
}

function confirmOrder() {
  mutation.confirm.mutate(reference, { onSuccess, onError })
}

function onConfirm() {
  if (!canSubmit.value) return

  submitError.value = ""
  conflict.value = undefined
  if (isConfirmation.value) {
    confirmOrder()
    return
  }
  const input: AdvanceOrderInput = { vers: transition }
  const trimmedMotif = motif.value.trim()
  if (trimmedMotif) input.motif = trimmedMotif
  if (motifCloture.value) input.motifCloture = motifCloture.value
  if (requiresLivreur.value && livreurId.value) input.livreurId = livreurId.value

  mutation.advance.mutate({ reference, input }, { onSuccess, onError })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="orders-transition-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("orders.actions.transitionDialog.title", { transition: targetLabel }) }}</DialogTitle>
        <DialogDescription>{{ t("orders.actions.transitionDialog.description", { reference }) }}</DialogDescription>
      </DialogHeader>

      <div v-if="requiresLivreur" class="space-y-2">
        <Label for="orders-transition-dialog-livreur">{{ t("orders.actions.transitionDialog.livreur") }}</Label>
        <OrdersLivreurSelect v-model="livreurId" :disabled="isPending" />
        <p class="text-muted-foreground text-xs">
          {{ t("orders.actions.transitionDialog.livreurHint") }}
        </p>
      </div>

      <p
        v-if="requiresClosureReason"
        data-testid="orders-transition-dialog-reception"
        class="rounded-md border px-3 py-2 text-xs"
        :class="confirmeParClient ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'"
      >
        {{
          confirmeParClient
            ? t("orders.actions.transitionDialog.receptionConfirmee", { date: dateReception })
            : t("orders.actions.transitionDialog.receptionAbsente")
        }}
      </p>

      <div v-if="requiresClosureReason" class="space-y-2">
        <Label for="orders-transition-dialog-motif-cloture">{{
          t("orders.actions.transitionDialog.closeReason")
        }}</Label>
        <Select v-model="motifCloture" :disabled="isPending">
          <SelectTrigger
            id="orders-transition-dialog-motif-cloture"
            data-testid="orders-transition-dialog-motif-cloture"
            class="w-full"
          >
            <SelectValue :placeholder="t('orders.actions.transitionDialog.closeReasonPlaceholder')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                v-for="option in closureMotives"
                :key="option"
                :value="option"
                :disabled="motifRefuse(option)"
              >
                {{ t(`orders.closureMotives.${option}`) }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="orders-transition-dialog-motif">{{ t("orders.actions.transitionDialog.reason") }}</Label>
        <Textarea
          id="orders-transition-dialog-motif"
          v-model="motif"
          data-testid="orders-transition-dialog-motif"
          :placeholder="t('orders.actions.transitionDialog.reasonPlaceholder')"
          maxlength="200"
          :disabled="isPending"
        />
      </div>

      <OrdersConfirmConflict v-if="conflict" :conflict="conflict" :product-names="productNames" />

      <p v-if="submitError" data-testid="orders-transition-dialog-error" role="alert" class="text-sm text-destructive">
        {{ submitError }}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isPending" @click="open = false">
          {{ t("orders.actions.transitionDialog.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="orders-transition-confirm"
          :disabled="isPending || !canSubmit"
          :aria-busy="isPending ? true : undefined"
          @click="onConfirm"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          {{ t("orders.actions.transitionDialog.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
