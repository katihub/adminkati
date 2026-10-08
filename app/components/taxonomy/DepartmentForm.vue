<script setup lang="ts">
import type { Rayon, RayonCreateInput, RayonPatchInput } from "@/types/api/taxonomie"
import { computed, reactive, ref, watch } from "vue"
import { Textarea } from "@/components/ui/textarea"
import { slugify } from "@/utils/slug"

const props = defineProps<{
  department: Rayon | null
  pending: boolean
}>()

const emit = defineEmits<{
  submit: [input: RayonCreateInput | RayonPatchInput]
  dirty: [value: boolean]
}>()

const { t } = useI18n()

/**
 * LE 400 ÉTAIT MUET. Le formulaire n'avait aucune contrainte alors que le
 * backend en impose cinq : « Gros Électroménager » dans l'identifiant partait,
 * revenait refusé, et rien ne s'affichait. Ces deux constantes sont la copie
 * littérale de `CreerRayonDto`/`ModifierRayonDto`
 * (`src/catalogue/administration.dto.ts`) — si elles y changent, elles
 * changent ici.
 */
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_LENGTH = { id: 60, slug: 120, nom: 120, nom_court: 40, accroche: 300 } as const

type Field = keyof typeof MAX_LENGTH
interface FieldError {
  key: string
  params: Record<string, unknown>
}

const values = reactive({ id: "", slug: "", nom: "", nom_court: "", accroche: "" })
const errors = reactive<Record<Field, FieldError | null>>({
  id: null,
  slug: null,
  nom: null,
  nom_court: null,
  accroche: null,
})
const initialSnapshot = ref("")
const idTouched = ref(false)
const slugTouched = ref(false)

function snapshot() {
  return JSON.stringify(values)
}

function applyDepartment(department: Rayon | null) {
  Object.assign(values, {
    id: department?.id ?? "",
    slug: department?.slug ?? "",
    nom: department?.nom ?? "",
    nom_court: department?.nom_court ?? "",
    accroche: department?.accroche ?? "",
  })
  idTouched.value = Boolean(department)
  slugTouched.value = Boolean(department)
  clearErrors()
  initialSnapshot.value = snapshot()
}

applyDepartment(props.department)
watch(() => props.department, applyDepartment)
watch(
  () => values.nom,
  name => {
    if (props.department) return
    if (!idTouched.value) values.id = slugify(name)
    if (!slugTouched.value) values.slug = slugify(name)
  },
)

const isDirty = computed(() => snapshot() !== initialSnapshot.value)
watch(isDirty, value => emit("dirty", value), { immediate: true })

/** Le slug que le nom donnerait — proposé dès que l'opérateur a écrit autre chose. */
const suggestion = computed(() => slugify(values.nom))
const suggestsId = computed(() => !props.department && suggestion.value !== "" && suggestion.value !== values.id.trim())
const suggestsSlug = computed(
  () => !props.department && suggestion.value !== "" && suggestion.value !== values.slug.trim(),
)

function clearErrors() {
  for (const field of Object.keys(errors) as Field[]) errors[field] = null
}

function lengthError(value: string, field: Field, required: boolean): FieldError | null {
  const trimmed = value.trim()
  if (!trimmed) return required ? { key: "validation.required", params: {} } : null
  if (trimmed.length > MAX_LENGTH[field])
    return { key: "taxonomy.departments.validation.tooLong", params: { max: MAX_LENGTH[field] } }
  return null
}

function identifierError(value: string, field: "id" | "slug"): FieldError | null {
  return (
    lengthError(value, field, true) ??
    (IDENTIFIER_PATTERN.test(value.trim()) ? null : { key: "taxonomy.departments.validation.format", params: {} })
  )
}

/** Un champ n'est exigé que s'il part : une modification n'envoie que ce qui a changé. */
function validate(submitted: ReadonlySet<Field>): boolean {
  clearErrors()
  if (submitted.has("id")) errors.id = identifierError(values.id, "id")
  if (submitted.has("slug")) errors.slug = identifierError(values.slug, "slug")
  if (submitted.has("nom")) errors.nom = lengthError(values.nom, "nom", true)
  if (submitted.has("nom_court")) errors.nom_court = lengthError(values.nom_court, "nom_court", true)
  if (submitted.has("accroche")) errors.accroche = lengthError(values.accroche, "accroche", false)
  return Object.values(errors).every(error => error === null)
}

function buildPatch(department: Rayon): RayonPatchInput {
  return {
    ...(values.nom.trim() !== department.nom ? { nom: values.nom.trim() } : {}),
    ...(values.nom_court.trim() !== (department.nom_court ?? "") ? { nom_court: values.nom_court.trim() } : {}),
    /* Vidée volontairement, l'accroche s'efface : `ModifierRayonDto` accepte `null`. */
    ...(values.accroche.trim() !== (department.accroche ?? "") ? { accroche: values.accroche.trim() || null } : {}),
  }
}

function submitPatch(department: Rayon) {
  const patch = buildPatch(department)
  const touchedFields = new Set(Object.keys(patch) as Field[])
  if (touchedFields.size === 0 || !validate(touchedFields)) return
  emit("submit", patch)
}

function submitCreate() {
  if (!validate(new Set<Field>(["id", "slug", "nom", "nom_court", "accroche"]))) return
  emit("submit", {
    id: values.id.trim(),
    slug: values.slug.trim(),
    nom: values.nom.trim(),
    nom_court: values.nom_court.trim(),
    ...(values.accroche.trim() ? { accroche: values.accroche.trim() } : {}),
  } satisfies RayonCreateInput)
}

function submit() {
  if (props.department) submitPatch(props.department)
  else submitCreate()
}
</script>

<template>
  <!-- fallow-ignore-next-line complexity -->
  <form
    id="department-form"
    data-testid="department-form"
    class="flex flex-col gap-5"
    novalidate
    @submit.prevent="submit"
  >
    <template v-if="!department">
      <label class="flex flex-col gap-2" for="department-form-id">
        <span class="text-sm font-medium">{{ t("taxonomy.departments.id") }}</span>
        <input
          id="department-form-id"
          v-model="values.id"
          :disabled="pending"
          :aria-invalid="Boolean(errors.id)"
          class="h-10 rounded-2xl border border-input bg-background px-3"
          data-testid="department-form-id"
          @input="idTouched = true"
        />
        <!-- La règle une seule fois : en rappel tant qu'elle tient, en refus quand elle casse. -->
        <span v-if="!errors.id" class="text-xs text-muted-foreground" data-testid="department-form-id-hint">{{
          t("taxonomy.departments.validation.format")
        }}</span>
        <span v-else class="text-sm text-destructive" data-testid="department-form-id-error">{{
          t(errors.id.key, errors.id.params)
        }}</span>
        <button
          v-if="suggestsId"
          type="button"
          class="self-start text-xs font-medium text-primary underline underline-offset-2"
          data-testid="department-form-id-suggestion"
          @click="values.id = suggestion"
        >
          {{ t("taxonomy.departments.validation.useSuggestion", { slug: suggestion }) }}
        </button>
      </label>
      <label class="flex flex-col gap-2" for="department-form-slug">
        <span class="text-sm font-medium">{{ t("taxonomy.form.slug") }}</span>
        <input
          id="department-form-slug"
          v-model="values.slug"
          :disabled="pending"
          :aria-invalid="Boolean(errors.slug)"
          class="h-10 rounded-2xl border border-input bg-background px-3"
          data-testid="department-form-slug"
          @input="slugTouched = true"
        />
        <span v-if="errors.slug" class="text-sm text-destructive" data-testid="department-form-slug-error">{{
          t(errors.slug.key, errors.slug.params)
        }}</span>
        <button
          v-if="suggestsSlug"
          type="button"
          class="self-start text-xs font-medium text-primary underline underline-offset-2"
          data-testid="department-form-slug-suggestion"
          @click="values.slug = suggestion"
        >
          {{ t("taxonomy.departments.validation.useSuggestion", { slug: suggestion }) }}
        </button>
      </label>
    </template>
    <p v-else class="text-sm text-muted-foreground">
      {{ t("taxonomy.departments.identifierValue", { id: department.id, slug: department.slug }) }}
    </p>
    <label class="flex flex-col gap-2" for="department-form-name">
      <span class="text-sm font-medium">{{ t("taxonomy.departments.name") }}</span>
      <input
        id="department-form-name"
        v-model="values.nom"
        :disabled="pending"
        :aria-invalid="Boolean(errors.nom)"
        class="h-10 rounded-2xl border border-input bg-background px-3"
        data-testid="department-form-name"
      />
      <span v-if="errors.nom" class="text-sm text-destructive" data-testid="department-form-name-error">{{
        t(errors.nom.key, errors.nom.params)
      }}</span>
    </label>
    <label class="flex flex-col gap-2" for="department-form-short-name">
      <span class="text-sm font-medium">{{ t("taxonomy.departments.shortName") }}</span>
      <input
        id="department-form-short-name"
        v-model="values.nom_court"
        :disabled="pending"
        :aria-invalid="Boolean(errors.nom_court)"
        class="h-10 rounded-2xl border border-input bg-background px-3"
        data-testid="department-form-short-name"
      />
      <span v-if="errors.nom_court" class="text-sm text-destructive" data-testid="department-form-short-name-error">{{
        t(errors.nom_court.key, errors.nom_court.params)
      }}</span>
    </label>
    <label class="flex flex-col gap-2" for="department-form-accroche">
      <span class="text-sm font-medium">{{ t("taxonomy.departments.accroche") }}</span>
      <Textarea
        id="department-form-accroche"
        v-model="values.accroche"
        :disabled="pending"
        :aria-invalid="Boolean(errors.accroche)"
        data-testid="department-form-accroche"
        :placeholder="t('taxonomy.departments.accrochePlaceholder')"
      />
      <span class="text-xs text-muted-foreground" data-testid="department-form-accroche-hint">{{
        t("taxonomy.departments.accrocheHint")
      }}</span>
      <span v-if="errors.accroche" class="text-sm text-destructive" data-testid="department-form-accroche-error">{{
        t(errors.accroche.key, errors.accroche.params)
      }}</span>
    </label>
    <button type="submit" class="sr-only" :disabled="pending">
      {{ t("taxonomy.departments.save") }}
    </button>
  </form>
</template>
