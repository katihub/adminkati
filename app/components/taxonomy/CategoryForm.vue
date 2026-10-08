<script setup lang="ts">
import type { CategorieInput } from "@/schemas/categorie"
import type { Categorie, CategorieCreateInput, CategoriePatchInput, Rayon } from "@/types/api/taxonomie"
import { computed, reactive, ref, watch } from "vue"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { categorieSchema } from "@/schemas/categorie"
import { getCategoryDescendantIds } from "@/utils/category-tree"
import { toFieldErrorKeys } from "@/utils/form-errors"
import { slugify } from "@/utils/slug"

const props = defineProps<{
  category: Categorie | null
  categories: Categorie[]
  departments: Rayon[]
  pending: boolean
}>()

const emit = defineEmits<{
  submit: [input: CategorieCreateInput | CategoriePatchInput]
  dirty: [value: boolean]
}>()

const { t } = useI18n()
const EMPTY_SELECT_VALUE = "__empty__"
const values = reactive({ nom: "", slug: "", parent_id: null as number | null, rayon_id: "" })
const initialSnapshot = ref("")
const slugTouched = ref(false)

function onSlugInput(event: Event) {
  slugTouched.value = true
  values.slug = (event.target as HTMLInputElement).value
}
const errorKeys = reactive<Record<keyof CategorieInput, string>>({ nom: "", slug: "", parent_id: "", rayon_id: "" })

function snapshot() {
  return JSON.stringify(values)
}

function fieldOrEmpty(category: Categorie | null, field: "nom" | "slug"): string {
  return category?.[field] ?? ""
}

function resolveParentId(category: Categorie | null): number | null {
  return category?.parent_id ?? null
}

function resolveRayonId(category: Categorie | null): string {
  if (!category || category.parent_id != null) return ""
  return category.rayon ?? ""
}

function categorySnapshot(category: Categorie | null) {
  return {
    nom: fieldOrEmpty(category, "nom"),
    slug: fieldOrEmpty(category, "slug"),
    parent_id: resolveParentId(category),
    rayon_id: resolveRayonId(category),
  }
}

function applyCategory(category: Categorie | null) {
  Object.assign(values, categorySnapshot(category))
  slugTouched.value = false
  initialSnapshot.value = snapshot()
}

applyCategory(props.category)
watch(() => props.category, applyCategory)
watch(
  () => values.nom,
  name => {
    if (!props.category && !slugTouched.value) values.slug = slugify(name)
  },
)

const isDirty = computed(() => snapshot() !== initialSnapshot.value)
watch(isDirty, value => emit("dirty", value), { immediate: true })

const excludedParentIds = computed(() =>
  props.category
    ? new Set([props.category.id, ...getCategoryDescendantIds(props.categories, props.category.id)])
    : new Set<number>(),
)
const parentCandidates = computed(() => props.categories.filter(category => !excludedParentIds.value.has(category.id)))
const hasParent = computed(() => values.parent_id !== null)
const inheritedDepartment = computed(
  () => props.categories.find(category => category.id === values.parent_id)?.rayon ?? null,
)

function clearErrors() {
  for (const field of Object.keys(errorKeys) as (keyof CategorieInput)[]) errorKeys[field] = ""
}

function updateParent(value: string) {
  values.parent_id = value && value !== EMPTY_SELECT_VALUE ? Number(value) : null
  if (values.parent_id !== null) values.rayon_id = ""
}

function updateDepartment(value: string) {
  values.rayon_id = value && value !== EMPTY_SELECT_VALUE ? value : ""
}

function buildInput(parsed: CategorieInput): CategorieCreateInput | CategoriePatchInput {
  const normalized =
    parsed.parent_id === null
      ? // `parent_id: null` EST ENVOYÉ EXPLICITEMENT. Omise, la clé est ignorée
        // par le service (il ne lit que ce qui est présent) : l'opérateur
        // choisissait « Aucun parent », enregistrait, le panneau se fermait sans
        // erreur — et la catégorie n'avait pas bougé.
        { nom: parsed.nom, slug: parsed.slug, rayon_id: parsed.rayon_id!, parent_id: null }
      : { nom: parsed.nom, slug: parsed.slug, parent_id: parsed.parent_id }

  if (!props.category) return normalized

  const initial = JSON.parse(initialSnapshot.value) as typeof values
  return Object.fromEntries(
    Object.entries(normalized).filter(([key, value]) => initial[key as keyof typeof initial] !== value),
  ) as CategoriePatchInput
}

function submit() {
  clearErrors()
  const result = categorieSchema.safeParse({
    nom: values.nom,
    slug: values.slug,
    parent_id: values.parent_id,
    ...(values.parent_id === null ? { rayon_id: values.rayon_id || null } : {}),
  })

  if (!result.success) {
    Object.assign(errorKeys, toFieldErrorKeys(result.error))
    return
  }

  emit("submit", buildInput(result.data))
}
</script>

<template>
  <!-- fallow-ignore-next-line complexity -->
  <form id="category-form" data-testid="category-form" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
    <label class="flex flex-col gap-2" for="category-form-name">
      <span class="text-sm font-medium">{{ t("taxonomy.form.name") }}</span>
      <input
        id="category-form-name"
        v-model="values.nom"
        :disabled="pending"
        :aria-invalid="Boolean(errorKeys.nom)"
        class="h-10 rounded-2xl border border-input bg-background px-3"
        data-testid="category-form-name"
      />
      <span v-if="errorKeys.nom" class="text-sm text-destructive">{{ t(errorKeys.nom) }}</span>
    </label>
    <label class="flex flex-col gap-2" for="category-form-slug">
      <span class="text-sm font-medium">{{ t("taxonomy.form.slug") }}</span>
      <input
        id="category-form-slug"
        :value="values.slug"
        :disabled="pending"
        :aria-invalid="Boolean(errorKeys.slug)"
        class="h-10 rounded-2xl border border-input bg-background px-3"
        data-testid="category-form-slug"
        @input="onSlugInput"
      />
      <span v-if="errorKeys.slug" class="text-sm text-destructive">{{ t(errorKeys.slug) }}</span>
    </label>
    <label class="flex flex-col gap-2" for="category-form-parent">
      <span class="text-sm font-medium">{{ t("taxonomy.form.parent") }}</span>
      <Select
        :model-value="values.parent_id === null ? undefined : String(values.parent_id)"
        :disabled="pending"
        @update:model-value="value => updateParent(value ? String(value) : '')"
      >
        <SelectTrigger
          id="category-form-parent"
          data-testid="category-form-parent"
          class="w-full"
          :aria-invalid="Boolean(errorKeys.parent_id)"
        >
          <SelectValue :placeholder="t('taxonomy.form.noParent')" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem :value="EMPTY_SELECT_VALUE" data-testid="category-form-parent-option-none">
              {{ t("taxonomy.form.noParent") }}
            </SelectItem>
            <SelectItem
              v-for="candidate in parentCandidates"
              :key="candidate.id"
              :value="String(candidate.id)"
              :data-testid="`category-form-parent-option-${candidate.id}`"
            >
              {{ candidate.nom }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <span v-if="errorKeys.parent_id" class="text-sm text-destructive">{{ t(errorKeys.parent_id) }}</span>
    </label>
    <label v-if="!hasParent" class="flex flex-col gap-2" for="category-form-department">
      <span class="text-sm font-medium">{{ t("taxonomy.form.department") }}</span>
      <Select
        :model-value="values.rayon_id || undefined"
        :disabled="pending"
        @update:model-value="value => updateDepartment(value ? String(value) : '')"
      >
        <SelectTrigger
          id="category-form-department"
          data-testid="category-form-department"
          class="w-full"
          :aria-invalid="Boolean(errorKeys.rayon_id)"
        >
          <SelectValue :placeholder="t('taxonomy.form.chooseDepartment')" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem :value="EMPTY_SELECT_VALUE" data-testid="category-form-department-option-none">
              {{ t("taxonomy.form.chooseDepartment") }}
            </SelectItem>
            <SelectItem
              v-for="department in departments"
              :key="department.id"
              :value="department.id"
              :data-testid="`category-form-department-option-${department.id}`"
            >
              {{ department.nom }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <span v-if="errorKeys.rayon_id" class="text-sm text-destructive">{{ t(errorKeys.rayon_id) }}</span>
    </label>
    <p v-else class="text-sm text-muted-foreground" data-testid="category-form-inherited-department">
      {{ t("taxonomy.form.inheritedDepartment", { department: inheritedDepartment ?? "—" }) }}
    </p>
    <button type="submit" class="sr-only" :disabled="pending">
      {{ t("taxonomy.form.save") }}
    </button>
  </form>
</template>
