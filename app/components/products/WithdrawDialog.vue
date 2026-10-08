<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed, ref, useId, watch } from "vue"
import { toast } from "vue-sonner"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWithdrawProduit } from "@/composables/useProduitMutations"
import { apiErrorText } from "@/utils/api-error"

const { productId, productName } = defineProps<{
  productId: number
  productName: string
}>()

const emit = defineEmits<{ withdrawn: [product: ProductDetail] }>()

const { t } = useI18n()

const open = ref(false)
const motif = ref("")
const submitError = ref("")
const motifId = useId()

const withdrawMutation = useWithdrawProduit(computed(() => productId))
const isWithdrawing = computed(() => withdrawMutation.isPending.value)
const isWithdrawingAriaBusy = computed<true | undefined>(() => (isWithdrawing.value ? true : undefined))

/** Every fresh open starts from a clean slate — a leftover reason or error from a
 *  previous, cancelled attempt shouldn't reappear the next time this is opened. */
watch(open, value => {
  if (value) {
    motif.value = ""
    submitError.value = ""
  }
})

function onCancel() {
  open.value = false
}

function onConfirm() {
  submitError.value = ""
  withdrawMutation.mutate(
    { motif: motif.value.trim() || undefined },
    {
      onSuccess: product => {
        open.value = false
        toast.success(t("products.toast.withdrawSuccess", { name: product.nom }))
        emit("withdrawn", product)
      },
      onError: (error: unknown) => {
        submitError.value = apiErrorText(error, t)
      },
    },
  )
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" variant="secondary" data-testid="products-withdraw-dialog-trigger">
        <Icon name="ph:archive-tray" size="18" aria-hidden="true" />
        {{ t("products.withdrawDialog.trigger") }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="products-withdraw-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("products.withdrawDialog.title") }}</DialogTitle>
        <DialogDescription>{{ t("products.withdrawDialog.description", { name: productName }) }}</DialogDescription>
      </DialogHeader>

      <div>
        <Label :for="motifId" class="mb-2 block text-sm font-medium text-foreground">{{
          t("products.withdrawDialog.motifLabel")
        }}</Label>
        <Textarea
          :id="motifId"
          v-model="motif"
          data-testid="products-withdraw-dialog-motif"
          :placeholder="t('products.withdrawDialog.motifPlaceholder')"
          maxlength="500"
        />
      </div>

      <p v-if="submitError" data-testid="products-withdraw-dialog-error" role="alert" class="text-sm text-destructive">
        {{ submitError }}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" data-testid="products-withdraw-dialog-cancel" @click="onCancel">
          {{ t("products.withdrawDialog.cancel") }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="products-withdraw-dialog-confirm"
          :disabled="isWithdrawing || !motif.trim()"
          :aria-busy="isWithdrawingAriaBusy"
          @click="onConfirm"
        >
          <Spinner v-if="isWithdrawing" data-icon="inline-start" />
          {{ t("products.withdrawDialog.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
