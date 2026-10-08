<script setup lang="ts">
import type { PointVenteFormInput, PointVenteValues } from "@/schemas/point-vente"
import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { PointVenteWizardStep } from "@/types/point-vente-wizard"
import type { PointVenteSection } from "@/utils/point-of-sale"
import type { ZodError } from "zod/v4"
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from "vue"
import { usePointVenteMutations } from "@/composables/usePointsVente"
import {
  POINT_VENTE_LENGTHS,
  pointVenteContactInfoSchema,
  pointVenteIdentitySchema,
  pointVenteSchema,
} from "@/schemas/point-vente"
import { apiErrorText } from "@/utils/api-error"
import { toFieldErrorKeys } from "@/utils/form-errors"
import {
  buildCreerPointVente,
  buildModifierPointVente,
  cleFromLibelle,
  sectionOfPath,
  toPointVenteForm,
} from "@/utils/point-of-sale"

const props = withDefaults(
  defineProps<{ point: PointVenteAdmin | null; formId: string; section?: PointVenteSection | null }>(),
  {
    section: null,
  },
)

const emit = defineEmits<{ saved: []; created: [id: number] }>()

const { t } = useI18n()

const mode = computed<"create" | "edit">(() => (props.point ? "edit" : "create"))
const isCreate = computed(() => mode.value === "create")
const { create, update } = usePointVenteMutations()
const isSaving = computed(() => create.isPending.value || update.isPending.value)

const values = reactive<PointVenteFormInput>(toPointVenteForm(null))
const errorKeys = ref<Record<string, string>>({})
const submitError = ref("")
const initialValues = ref<PointVenteFormInput>(toPointVenteForm(null))
const cleFollowsLibelle = ref(true)

function applyPoint(point: PointVenteAdmin | null) {
  Object.assign(values, toPointVenteForm(point))
  errorKeys.value = {}
  submitError.value = ""
  cleFollowsLibelle.value = point === null
  initialValues.value = structuredClone(toPointVenteForm(point))
}

applyPoint(props.point)
watch(
  () => props.point?.id,
  () => applyPoint(props.point),
)

watch(
  () => values.libelle,
  libelle => {
    if (isCreate.value && cleFollowsLibelle.value) values.cle = cleFromLibelle(libelle, POINT_VENTE_LENGTHS.cle.max)
  },
)

function stopFollowingCle() {
  cleFollowsLibelle.value = values.cle === ""
}

function valueAt(path: string): string {
  return JSON.stringify(
    path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], values),
  )
}

watch(
  () => Object.fromEntries(Object.keys(errorKeys.value).map(path => [path, valueAt(path)])),
  (next, previous) => {
    const edited = Object.keys(next).filter(path => path in previous && next[path] !== previous[path])
    if (edited.length)
      errorKeys.value = Object.fromEntries(Object.entries(errorKeys.value).filter(([path]) => !edited.includes(path)))
  },
)

const changedCount = computed(
  () =>
    (Object.keys(values) as (keyof PointVenteFormInput)[]).filter(
      key => JSON.stringify(values[key]) !== JSON.stringify(initialValues.value[key]),
    ).length,
)
const isDirty = computed(() => changedCount.value > 0)
const saveDisabled = computed(() => isSaving.value || (!isCreate.value && !isDirty.value))
const changes = computed(() => changedCount.value)
const submitLabel = computed(() =>
  changes.value
    ? t("pointsOfSale.drawer.saveChanges", { count: changes.value }, changes.value)
    : t("pointsOfSale.form.save"),
)

function errorText(path: string) {
  const key = errorKeys.value[path]
  if (!key) return ""
  return path in POINT_VENTE_LENGTHS ? t(key, POINT_VENTE_LENGTHS[path as keyof typeof POINT_VENTE_LENGTHS]) : t(key)
}

const contactErrors = computed(() => ({
  telephones: values.telephones.map((_, index) => errorText(`telephones.${index}`)),
  horaires: errorText("horaires"),
}))

const mapErrors = computed(() => ({
  carte: errorText("carte"),
  latitude: errorText("latitude"),
  longitude: errorText("longitude"),
}))

const formRef = useTemplateRef<HTMLFormElement>("formRef")
const stepHeading = useTemplateRef<HTMLElement>("stepHeading")

function stepForSection(section: PointVenteSection | null): PointVenteWizardStep {
  return section === "identity" || section === null ? "identity" : "contact-info"
}

const currentStep = ref<PointVenteWizardStep>(stepForSection(props.section))

function controlFor(path: string): HTMLElement | null {
  const [field, index] = path.split(".")
  if (field === "telephones")
    return (
      formRef.value?.querySelectorAll<HTMLElement>("[data-testid='points-of-sale-form-telephone']")[Number(index)] ??
      null
    )
  return formRef.value?.querySelector<HTMLElement>(`[data-testid='points-of-sale-form-${field}']`) ?? null
}

async function focusStep() {
  await nextTick()
  stepHeading.value?.focus()
}

async function focusPath(path: string) {
  const section = sectionOfPath(path)
  if (section) currentStep.value = stepForSection(section)
  await nextTick()
  controlFor(path)?.focus()
}

async function focusSection(section: PointVenteSection) {
  currentStep.value = stepForSection(section)
  await nextTick()
  const target = section === "identity" ? "libelle" : section === "contact" ? "telephone" : "carte"
  controlFor(target)?.focus()
}

function displayErrors(error: ZodError) {
  errorKeys.value = toFieldErrorKeys(error)
  const firstPath = Object.keys(errorKeys.value)[0]
  if (firstPath) void focusPath(firstPath)
}

function canAdvance() {
  const result =
    currentStep.value === "identity"
      ? pointVenteIdentitySchema.safeParse(values)
      : pointVenteContactInfoSchema.safeParse(values)
  if (!result.success) {
    displayErrors(result.error)
    return false
  }
  errorKeys.value = {}
  return true
}

function next() {
  if (!canAdvance()) return
  currentStep.value = currentStep.value === "identity" ? "contact-info" : "review"
  void focusStep()
}

function back() {
  currentStep.value = currentStep.value === "review" ? "contact-info" : "identity"
  void focusStep()
}

function edit(step: "identity" | "contact-info") {
  currentStep.value = step
  void focusStep()
}

function validatedValues(): PointVenteValues | null {
  const result = pointVenteSchema.safeParse(values)
  if (!result.success) {
    displayErrors(result.error)
    return null
  }
  errorKeys.value = {}
  submitError.value = ""
  return result.data
}

function setSubmitError(error: unknown) {
  submitError.value = apiErrorText(error, t)
}

function submitCreate(values: PointVenteValues) {
  create.mutate(buildCreerPointVente(values), {
    onSuccess: created => emit("created", created.id),
    onError: setSubmitError,
  })
}

function submitEdit(values: PointVenteValues, point: PointVenteAdmin) {
  const patch = buildModifierPointVente(values, point)
  if (Object.keys(patch).length === 0) {
    emit("saved")
    return
  }
  update.mutate(
    { id: point.id, patch },
    {
      onSuccess: () => emit("saved"),
      onError: setSubmitError,
    },
  )
}

function onSubmit() {
  if (currentStep.value !== "review") return
  const validated = validatedValues()
  if (!validated) return
  if (isCreate.value) return submitCreate(validated)
  submitEdit(validated, props.point!)
}

const active = computed({
  get: () => values.active,
  set: (value: boolean) => {
    values.active = value
  },
})

watch(
  () => props.section,
  section => {
    if (section) void focusSection(section)
  },
)

onMounted(() => {
  if (props.section) void focusSection(props.section)
  else void focusStep()
})

defineExpose({ active, changedCount, isDirty, isSaving, saveDisabled, submitError })
</script>

<template>
  <form
    :id="formId"
    ref="formRef"
    data-testid="points-of-sale-form"
    class="space-y-6 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:bg-background [&_[data-slot=textarea]]:rounded-lg [&_[data-slot=textarea]]:bg-background"
    novalidate
    @submit.prevent="onSubmit"
  >
    <PointsOfSaleWizardProgress :current="currentStep" />

    <section v-if="currentStep === 'identity'" aria-labelledby="points-of-sale-wizard-identity-title">
      <h2 id="points-of-sale-wizard-identity-title" ref="stepHeading" tabindex="-1" class="sr-only">
        {{ t("pointsOfSale.drawer.wizard.steps.identity") }}
      </h2>
      <PointsOfSaleIdentityFields
        v-model:cle="values.cle"
        v-model:libelle="values.libelle"
        v-model:ville="values.ville"
        v-model:quartier="values.quartier"
        v-model:repere="values.repere"
        :errors="Object.fromEntries(Object.keys(errorKeys).map(path => [path, errorText(path)]))"
        :mode="mode"
        :cle-follows-libelle="cleFollowsLibelle"
        @cle-input="stopFollowingCle"
      />
    </section>

    <section
      v-else-if="currentStep === 'contact-info'"
      aria-labelledby="points-of-sale-wizard-contact-title"
      class="space-y-8"
    >
      <h2 id="points-of-sale-wizard-contact-title" ref="stepHeading" tabindex="-1" class="sr-only">
        {{ t("pointsOfSale.drawer.wizard.steps.contact-info") }}
      </h2>
      <PointsOfSaleContactFields
        v-model:telephones="values.telephones"
        v-model:horaires="values.horaires"
        :errors="contactErrors"
      />
      <PointsOfSaleMapFields
        v-model:carte="values.carte"
        v-model:latitude="values.latitude"
        v-model:longitude="values.longitude"
        :errors="mapErrors"
      />
    </section>

    <section v-else aria-labelledby="points-of-sale-wizard-review-title">
      <h2 id="points-of-sale-wizard-review-title" ref="stepHeading" tabindex="-1" class="sr-only">
        {{ t("pointsOfSale.drawer.wizard.steps.review") }}
      </h2>
      <PointsOfSaleReviewStep :values="values" @edit="edit" />
    </section>

    <PointsOfSaleWizardActions
      :current="currentStep"
      :is-create="isCreate"
      :is-saving="isSaving"
      :save-disabled="saveDisabled"
      :submit-label="submitLabel"
      @back="back"
      @next="next"
    />
  </form>
</template>
