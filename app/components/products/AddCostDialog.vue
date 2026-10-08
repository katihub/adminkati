<script setup lang="ts">
import { computed, ref, useId, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAddProductCost } from "@/composables/useProductCosts"

const { productId } = defineProps<{ productId: number }>()

const { t } = useI18n()

const open = ref(false)
const amount = ref("")
const errorMessage = ref("")
const amountId = useId()

const addCost = useAddProductCost()
const isSaving = computed(() => addCost.isPending.value)

/** Each opening starts blank: a cost or error left by a cancelled attempt must not come back. */
watch(open, value => {
  if (value) {
    amount.value = ""
    errorMessage.value = ""
  }
})

function save() {
  const typed = String(amount.value).trim()
  const cost = Number(typed)
  /* `Number("")` is 0: an empty field would otherwise record a cost of zero. */
  if (typed === "" || !Number.isInteger(cost) || cost < 0) {
    errorMessage.value = t("products.costs.invalid")
    return
  }
  errorMessage.value = ""
  addCost.mutate(
    { productId, cost },
    {
      onSuccess: () => {
        open.value = false
      },
      onError: () => {
        errorMessage.value = t("products.costs.saveError")
      },
    },
  )
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" variant="secondary" size="sm" data-testid="product-cost-add">
        <Icon name="ph:plus" aria-hidden="true" />
        {{ t("products.costs.add") }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="product-cost-dialog" aria-describedby="undefined">
      <form class="grid gap-6" novalidate @submit.prevent="save">
        <DialogHeader>
          <DialogTitle>{{ t("products.costs.dialogTitle") }}</DialogTitle>
        </DialogHeader>

        <div class="space-y-1.5">
          <Label :for="amountId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.costs.amount") }}
          </Label>
          <Input
            :id="amountId"
            v-model="amount"
            data-testid="product-cost-amount"
            type="number"
            min="0"
            step="1"
            :disabled="isSaving"
          />
        </div>

        <p v-if="errorMessage" data-testid="product-cost-error" role="alert" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" data-testid="product-cost-cancel" @click="open = false">
            {{ t("products.costs.cancel") }}
          </Button>
          <Button type="submit" data-testid="product-cost-save" :disabled="isSaving">
            <Spinner v-if="isSaving" data-icon="inline-start" />
            {{ t("products.costs.save") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
