<script setup lang="ts">
import type { StockStatus } from "@/types/api/catalogue-products"
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { STOCK_STATUSES } from "@/types/api/catalogue-products"
import { apiErrorText } from "@/utils/api-error"

/**
 * One dialog for both scopes: a single offer (status, and quantity when the shop tracks its
 * stock) or every offer of a product (status only). The backend refuses to put a tracked offer
 * back on sale without units; the form says so before sending.
 */
type Target =
  | {
      kind: "offer"
      id: string
      statutStock: StockStatus
      suiviStock: boolean
      stock: { quantite: number; quantiteReservee: number } | null
    }
  | { kind: "product"; id: string }

const { target } = defineProps<{ target: Target }>()
const open = defineModel<boolean>("open", { required: true })
const { t } = useI18n()
const corrections = useCatalogueCorrections()
const status = ref<StockStatus>(target.kind === "offer" ? target.statutStock : "en_stock")
const quantity = ref<number>(target.kind === "offer" ? (target.stock?.quantite ?? 0) : 0)
const reason = ref("")
const pending = computed(
  () => corrections.availability.isPending.value || corrections.productAvailability.isPending.value,
)
const tracked = computed(() => target.kind === "offer" && target.suiviStock)
const reserved = computed(() => (target.kind === "offer" ? (target.stock?.quantiteReservee ?? 0) : 0))
const error = computed(() => {
  if (reason.value.trim().length < 5) return t("catalogue.availability.reasonRequired")
  if (tracked.value && status.value === "en_stock" && quantity.value <= reserved.value)
    return t("catalogue.availability.quantityRequired")
  return ""
})

async function submit() {
  if (error.value || pending.value) return
  try {
    if (target.kind === "offer") {
      await corrections.availability.mutateAsync({
        id: target.id,
        body: {
          statutStock: status.value,
          motif: reason.value.trim(),
          ...(tracked.value ? { quantite: quantity.value } : {}),
        },
      })
      toast.success(t("catalogue.availability.saved"))
    } else {
      const result = await corrections.productAvailability.mutateAsync({
        id: target.id,
        body: { statutStock: status.value, motif: reason.value.trim() },
      })
      if (result.sansPieces.length)
        toast.warning(t("catalogue.availability.savedAllMissing", { count: result.sansPieces.length }))
      else toast.success(t("catalogue.availability.saved"))
    }
    open.value = false
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>
<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="availability-dialog">
      <DialogHeader>
        <DialogTitle>{{
          t(target.kind === "offer" ? "catalogue.availability.change" : "catalogue.availability.changeAll")
        }}</DialogTitle>
        <DialogDescription>{{
          t(target.kind === "offer" ? "catalogue.availability.help" : "catalogue.availability.helpAll")
        }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-2">
          <Label for="availability-status">{{ t("catalogue.availability.status") }}</Label>
          <NativeSelect id="availability-status" v-model="status" data-testid="availability-status">
            <NativeSelectOption v-for="option in STOCK_STATUSES" :key="option" :value="option">{{
              t(`catalogue.availability.statuses.${option}`)
            }}</NativeSelectOption>
          </NativeSelect>
        </div>
        <div v-if="tracked" class="flex flex-col gap-2">
          <Label for="availability-quantity">{{ t("catalogue.availability.quantity") }}</Label>
          <Input
            id="availability-quantity"
            v-model.number="quantity"
            type="number"
            min="0"
            data-testid="availability-quantity"
          />
          <p class="text-xs text-muted-foreground">
            {{ t("catalogue.availability.quantityHelp", { reserved }) }}
          </p>
        </div>
        <p v-else-if="target.kind === 'offer'" class="text-xs text-muted-foreground">
          {{ t("catalogue.availability.untracked") }}
        </p>
        <div class="flex flex-col gap-2">
          <Label for="availability-reason">{{ t("catalogue.availability.reason") }}</Label>
          <Textarea
            id="availability-reason"
            v-model="reason"
            rows="3"
            maxlength="300"
            :placeholder="t('catalogue.availability.reasonPlaceholder')"
            data-testid="availability-reason"
          />
        </div>
        <p v-if="error && reason" class="text-sm text-destructive">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="open = false">{{ t("catalogue.availability.cancel") }}</Button>
          <Button type="submit" :disabled="Boolean(error) || pending" data-testid="availability-save">{{
            t("catalogue.availability.save")
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
