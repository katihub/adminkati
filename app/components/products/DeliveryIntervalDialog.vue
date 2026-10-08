<script setup lang="ts">
import type { DelaiLivraison, DelaiLivraisonInput, DelaiLivraisonPatch, DelaiUnite } from "@/types/api/delais-livraison"
import { computed, ref, useId, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useDeliveryIntervalLabel } from "@/composables/useDeliveryIntervalLabel"
import { useCreateDeliveryInterval, useUpdateDeliveryInterval } from "@/composables/useDeliveryIntervalMutations"
import { useDeliveryIntervals } from "@/composables/useDeliveryIntervals"
import { DELAI_UNITES } from "@/schemas/delai-livraison"
import { apiErrorText } from "@/utils/api-error"
import { checkDeliveryDraft, initialDraft } from "@/utils/delivery-draft"

const props = defineProps<{
  open: boolean
  interval?: DelaiLivraison | null
}>()
const emit = defineEmits<{
  "update:open": [value: boolean]
  saved: [option: DelaiLivraison]
}>()

const { t } = useI18n()
const intervalLabel = useDeliveryIntervalLabel()
const { data: options } = useDeliveryIntervals()
const createMutation = useCreateDeliveryInterval()
const updateMutation = useUpdateDeliveryInterval()

const unitId = useId()
const minId = useId()
const maxId = useId()

const unit = ref<DelaiUnite>("jours")
const mode = ref<"single" | "range">("single")
const min = ref<string | number>("")
const max = ref<string | number>("")
const errorMessage = ref("")

const isEdit = computed(() => Boolean(props.interval))
const locked = computed(() => (props.interval?.utilise_par ?? 0) > 0)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const fieldsDisabled = computed(() => locked.value || isSaving.value)
const isRange = computed(() => mode.value === "range")
const minLabelKey = computed(() =>
  isRange.value ? "products.delivery.dialog.rangeMin" : "products.delivery.dialog.min",
)
const dialogTitleKey = computed(() =>
  isEdit.value ? "products.delivery.dialog.editTitle" : "products.delivery.dialog.createTitle",
)
const MODES = ["single", "range"] as const

/** An empty field must not read as 0, which `Number("")` would give. */
function toNumber(raw: string | number): number {
  const text = String(raw).trim()
  return text === "" ? Number.NaN : Number(text)
}

const draft = computed(() => ({
  min_valeur: toNumber(min.value),
  max_valeur: isRange.value ? toNumber(max.value) : null,
  unite: unit.value,
}))

/** Not schema-bound: an existing option may exceed the form's 999 cap and must still read back. */
const preview = computed(() => {
  const { min_valeur, max_valeur, unite } = draft.value
  const positive = (value: number) => Number.isInteger(value) && value > 0
  const complete = positive(min_valeur) && (max_valeur === null || positive(max_valeur))
  return complete ? intervalLabel({ min_valeur, max_valeur, unite }) : ""
})

/** Each opening starts from the option being edited, or blank: a cancelled attempt must not come back. */
watch(
  () => props.open,
  value => {
    if (!value) return
    const initial = initialDraft(props.interval)
    unit.value = initial.unit
    mode.value = initial.mode
    min.value = initial.min
    max.value = initial.max
    errorMessage.value = ""
  },
  { immediate: true },
)

function changedFields(current: DelaiLivraison, next: DelaiLivraisonInput): DelaiLivraisonPatch {
  return {
    ...(next.min_valeur !== current.min_valeur ? { min_valeur: next.min_valeur } : {}),
    ...(next.max_valeur !== current.max_valeur ? { max_valeur: next.max_valeur } : {}),
    ...(next.unite !== current.unite ? { unite: next.unite } : {}),
  }
}

function onSaved(option: DelaiLivraison) {
  emit("saved", option)
  emit("update:open", false)
}

function onError(error: unknown) {
  errorMessage.value = apiErrorText(error, t)
}

/** Returns the input to send, or `null` after putting the reason in `errorMessage`. */
function validate(): DelaiLivraisonInput | null {
  const check = checkDeliveryDraft(draft.value, options.value ?? [], props.interval?.id)
  errorMessage.value = check.errorKey ? t(check.errorKey) : ""
  return check.input
}

function persist(input: DelaiLivraisonInput) {
  if (props.interval)
    updateMutation.mutate(
      { id: props.interval.id, patch: changedFields(props.interval, input) },
      { onSuccess: onSaved, onError },
    )
  else createMutation.mutate(input, { onSuccess: onSaved, onError })
}

function save() {
  if (props.interval && Object.keys(changedFields(props.interval, draft.value)).length === 0) {
    emit("update:open", false)
    return
  }

  const input = validate()
  if (input) persist(input)
}
</script>

<template>
  <Dialog :open="open" @update:open="value => emit('update:open', value)">
    <DialogContent data-testid="delivery-dialog" aria-describedby="undefined">
      <form class="grid gap-6" novalidate @submit.prevent="save">
        <DialogHeader>
          <DialogTitle>{{ t(dialogTitleKey) }}</DialogTitle>
        </DialogHeader>

        <p v-if="locked" data-testid="delivery-dialog-locked-hint" class="text-sm text-muted-foreground">
          {{ t("products.delivery.dialog.lockedHint", { count: interval?.utilise_par ?? 0 }) }}
        </p>

        <div class="space-y-1.5">
          <Label :for="unitId" class="text-xs font-semibold text-muted-foreground">
            {{ t("products.delivery.dialog.unit") }}
          </Label>
          <NativeSelect
            :id="unitId"
            v-model="unit"
            data-testid="delivery-dialog-unit"
            class="w-full"
            :disabled="fieldsDisabled"
          >
            <NativeSelectOption v-for="value in DELAI_UNITES" :key="value" :value="value">
              {{ t(`products.delivery.units.${value}`) }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="flex gap-2" role="group" :aria-label="t('products.delivery.dialog.mode')">
          <Button
            v-for="option in MODES"
            :key="option"
            type="button"
            size="sm"
            :variant="mode === option ? 'default' : 'outline'"
            :aria-pressed="mode === option"
            :disabled="fieldsDisabled"
            :data-testid="`delivery-dialog-mode-${option}`"
            @click="mode = option"
          >
            {{ t(`products.delivery.dialog.${option}`) }}
          </Button>
        </div>

        <div class="grid gap-4" :class="isRange ? 'grid-cols-2' : 'grid-cols-1'">
          <div class="space-y-1.5">
            <Label :for="minId" class="text-xs font-semibold text-muted-foreground">
              {{ t(minLabelKey) }}
            </Label>
            <Input
              :id="minId"
              v-model="min"
              data-testid="delivery-dialog-min"
              type="number"
              min="1"
              step="1"
              :disabled="fieldsDisabled"
            />
          </div>
          <div v-if="isRange" class="space-y-1.5">
            <Label :for="maxId" class="text-xs font-semibold text-muted-foreground">
              {{ t("products.delivery.dialog.rangeMax") }}
            </Label>
            <Input
              :id="maxId"
              v-model="max"
              data-testid="delivery-dialog-max"
              type="number"
              min="1"
              step="1"
              :disabled="fieldsDisabled"
            />
          </div>
        </div>

        <p class="text-sm text-muted-foreground">
          {{ t("products.delivery.dialog.preview") }}:
          <span data-testid="delivery-dialog-preview" class="font-medium text-foreground">{{ preview }}</span>
        </p>

        <p v-if="errorMessage" data-testid="delivery-dialog-error" role="alert" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t("products.delivery.dialog.cancel") }}
          </Button>
          <Button type="submit" data-testid="delivery-dialog-save" :disabled="fieldsDisabled">
            <Spinner v-if="isSaving" data-icon="inline-start" />
            {{ t("products.delivery.dialog.save") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
