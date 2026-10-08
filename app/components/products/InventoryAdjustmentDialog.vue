<script setup lang="ts">
import { computed, ref, useId, watch } from "vue"
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useAdjustProductInventory } from "@/composables/useProductInventory"
import { ajustementStockSchema } from "@/schemas/inventaire"
import { apiErrorText } from "@/utils/api-error"

const { productId } = defineProps<{ productId: number }>()

const { t } = useI18n()

const open = ref(false)
const type = ref<"reception" | "correction">("reception")
const variation = ref<string | number>("")
const reason = ref("")
const errorMessage = ref("")
const typeId = useId()
const variationId = useId()
const reasonId = useId()

const adjust = useAdjustProductInventory(() => productId)
const isSaving = computed(() => adjust.isPending.value)

/** Each opening starts blank; a failed attempt keeps its draft only while the dialog stays open. */
watch(open, value => {
  if (value) {
    type.value = "reception"
    variation.value = ""
    reason.value = ""
    errorMessage.value = ""
  }
})

/** A `type="number"` input can hand back a number rather than the typed string. */
function parseVariation(raw: string | number): number | undefined {
  const trimmed = String(raw).trim()
  return trimmed === "" ? undefined : Number(trimmed)
}

function save() {
  const parsed = ajustementStockSchema.safeParse({
    type: type.value,
    variation: parseVariation(variation.value),
    motif: reason.value,
  })
  if (!parsed.success) {
    errorMessage.value = t(parsed.error.issues[0]?.message ?? "validation.required")
    return
  }
  errorMessage.value = ""
  adjust.mutate(parsed.data, {
    onSuccess: () => {
      open.value = false
    },
    onError: error => {
      errorMessage.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button type="button" variant="secondary" size="sm" data-testid="product-inventory-adjust">
          <Icon name="ph:plus-minus" aria-hidden="true" />
          {{ t("products.inventory.adjust") }}
        </Button>
      </slot>
    </DialogTrigger>

    <DialogContent data-testid="inventory-adjustment-dialog">
      <form class="grid gap-5" novalidate @submit.prevent="save">
        <DialogHeader>
          <DialogTitle>{{ t("products.inventory.dialogTitle") }}</DialogTitle>
          <DialogDescription>{{ t("products.inventory.dialogDescription") }}</DialogDescription>
        </DialogHeader>

        <div class="space-y-1.5">
          <Label :for="typeId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.inventory.type") }}
          </Label>
          <NativeSelect
            :id="typeId"
            v-model="type"
            data-testid="inventory-adjustment-type"
            class="w-full"
            :disabled="isSaving"
          >
            <NativeSelectOption value="reception">
              {{ t("products.inventory.movementType.reception") }}
            </NativeSelectOption>
            <NativeSelectOption value="correction">
              {{ t("products.inventory.movementType.correction") }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="space-y-1.5">
          <Label :for="variationId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.inventory.variation") }}
          </Label>
          <Input
            :id="variationId"
            v-model="variation"
            data-testid="inventory-adjustment-variation"
            type="number"
            step="1"
            :disabled="isSaving"
          />
          <p class="text-xs text-muted-foreground">
            {{
              t(
                type === "reception"
                  ? "products.inventory.variationHintReception"
                  : "products.inventory.variationHintCorrection",
              )
            }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label :for="reasonId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.inventory.reason") }}
          </Label>
          <Input
            :id="reasonId"
            v-model="reason"
            data-testid="inventory-adjustment-reason"
            type="text"
            :placeholder="t('products.inventory.reasonPlaceholder')"
            :disabled="isSaving"
          />
        </div>

        <p v-if="errorMessage" data-testid="inventory-adjustment-error" role="alert" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSaving" @click="open = false">
            {{ t("products.inventory.cancel") }}
          </Button>
          <Button type="submit" data-testid="inventory-adjustment-save" :disabled="isSaving">
            <Spinner v-if="isSaving" data-icon="inline-start" />
            {{ t("products.inventory.save") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
