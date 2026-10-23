<script setup lang="ts">
import type { SellerSanctionType } from "@/types/api/marketplace-operations"
import { computed, ref, watch } from "vue"
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
import { useSellerTrustMutations } from "@/composables/useMarketplaceOperations"
import { SANCTION_REASON_MIN, SELLER_SANCTION_TYPES } from "@/types/api/marketplace-operations"
import { apiErrorText } from "@/utils/api-error"

const props = defineProps<{ sellerId: string; sellerName: string }>()
const open = defineModel<boolean>("open", { required: true })

const { t } = useI18n()
const { sanction } = useSellerTrustMutations()
const type = ref<SellerSanctionType>("avertissement")
const motif = ref("")
const endDate = ref("")

const today = new Date().toISOString().slice(0, 10)
const reasonTooShort = computed(() => motif.value.trim().length < SANCTION_REASON_MIN)
// Suspension and exclusion suspend every shop of the seller: the dialog says so before the click.
const blocksShops = computed(() => type.value === "suspension" || type.value === "exclusion")

watch(open, value => {
  if (!value) return
  type.value = "avertissement"
  motif.value = ""
  endDate.value = ""
})

async function submit() {
  if (reasonTooShort.value || sanction.isPending.value) return
  try {
    await sanction.mutateAsync({
      sellerId: props.sellerId,
      type: type.value,
      motif: motif.value.trim(),
      ...(endDate.value ? { termineLe: new Date(`${endDate.value}T23:59:59`).toISOString() } : {}),
    })
    toast.success(t("operations.trust.sanctionForm.done"))
    open.value = false
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="seller-sanction-form">
      <DialogHeader>
        <DialogTitle>{{ t("operations.trust.sanctionForm.title", { name: sellerName }) }}</DialogTitle>
        <DialogDescription>{{ t("operations.trust.sanctionForm.help") }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="sanction-type">{{ t("operations.trust.sanctionForm.type") }}</Label>
          <NativeSelect id="sanction-type" v-model="type" data-testid="seller-sanction-type">
            <NativeSelectOption v-for="option in SELLER_SANCTION_TYPES" :key="option" :value="option">{{
              t(`operations.trust.sanctionType.${option}`)
            }}</NativeSelectOption>
          </NativeSelect>
          <p v-if="blocksShops" class="text-xs text-destructive" data-testid="seller-sanction-warning">
            {{ t("operations.trust.sanctionForm.blocksShops") }}
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="sanction-reason">{{ t("operations.trust.sanctionForm.reason") }}</Label>
          <Textarea
            id="sanction-reason"
            v-model="motif"
            rows="4"
            maxlength="1000"
            data-testid="seller-sanction-reason"
          />
          <p class="text-xs text-muted-foreground">
            {{ t("operations.trust.reasonMin", { min: SANCTION_REASON_MIN }) }}
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="sanction-end">{{ t("operations.trust.sanctionForm.end") }}</Label>
          <Input id="sanction-end" v-model="endDate" type="date" :min="today" class="w-48" />
          <p class="text-xs text-muted-foreground">{{ t("operations.trust.sanctionForm.endHelp") }}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="sanction.isPending.value" @click="open = false">{{
            t("operations.trust.cancel")
          }}</Button>
          <Button
            type="submit"
            variant="destructive"
            :disabled="reasonTooShort || sanction.isPending.value"
            data-testid="seller-sanction-submit"
            >{{ t("operations.trust.sanction") }}</Button
          >
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
