<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type {
  CategorieCreateInput,
  CategoriePatchInput,
  Marque,
  RayonCreateInput,
  RayonPatchInput,
  TaxonomieResponse,
} from "@/types/api/taxonomie"
import type { CategoryTreeSort } from "@/utils/category-tree"
import type { BrandSort, FlatTaxonomySort } from "@/utils/taxonomy-table"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { prefetchApi } from "@/composables/useApi"
import { useTaxonomy } from "@/composables/useTaxonomy"
import { useTaxonomyMutations } from "@/composables/useTaxonomyMutations"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { buildCategoryTree, filterCategoryTree, sortCategoryTree } from "@/utils/category-tree"
import { sortBrands, sortDepartments } from "@/utils/taxonomy-table"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })

defineI18nRoute({
  paths: {
    en: "/taxonomy",
    fr: "/taxonomie",
  },
})

const { t } = useI18n()
const route = useRoute()
const activeTab = ref(
  route.query.brand !== undefined ? "brands" : route.query.department !== undefined ? "departments" : "categories",
)
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)

if (import.meta.server)
  await prefetchApi<TaxonomieResponse>(queryClient, apiQueryKeys.taxonomy.all, "/catalogue/administration/taxonomie")

const { data, error, isPending, refetch } = useTaxonomy()
const categories = computed(() => data.value?.categories ?? [])
const departments = computed(() => data.value?.rayons ?? [])
const brands = computed(() => data.value?.marques ?? [])
const { category, create, remove, department, createDepartment, removeDepartment, recalculate } = useTaxonomyMutations()

/** All three chips start present (empty/unset), inline, rather than needing a trip
 *  through the "+" menu on first load — the same pattern the `Filters` docs' own example
 *  uses for its `status`/`price` fields. Each `x` still removes one; the "+" menu adds it
 *  back. */
function neutralCategoryFilters(): Filter[] {
  return [
    { field: "q", operator: "contains", value: "" },
    { field: "department", operator: "eq", value: null },
    { field: "visibility", operator: "eq", value: null },
  ]
}

/** `CategoryToolbar` owns the actual filter UI (search, department, and visibility all
 *  live as `Filters` chips); this page only needs the three scalars back out to feed
 *  `filterCategoryTree`. */
const filters = ref<Filter[]>(neutralCategoryFilters())
const departmentFilters = ref<Filter[]>([{ field: "q", operator: "contains", value: "" }])
const brandFilters = ref<Filter[]>([{ field: "q", operator: "contains", value: "" }])

const search = computed(() => {
  const match = filters.value.find(filter => filter.field === "q")
  return typeof match?.value === "string" ? match.value : ""
})
const departmentId = computed(() => {
  const match = filters.value.find(filter => filter.field === "department")
  return typeof match?.value === "string" ? match.value : null
})
const visibility = computed<"all" | "visible" | "hidden">(() => {
  const match = filters.value.find(filter => filter.field === "visibility")
  return match?.value === "visible" || match?.value === "hidden" ? match.value : "all"
})
const departmentSearch = computed(() => {
  const match = departmentFilters.value.find(filter => filter.field === "q")
  return typeof match?.value === "string" ? match.value : ""
})
const brandSearch = computed(() => {
  const match = brandFilters.value.find(filter => filter.field === "q")
  return typeof match?.value === "string" ? match.value : ""
})
const sort = ref<CategoryTreeSort>({ key: "nom", direction: "asc" })
const departmentSort = ref<FlatTaxonomySort>({ key: "nom", direction: "asc" })
const brandSort = ref<BrandSort>({ key: "nom", direction: "asc" })
const manualExpandedIds = ref(new Set<number>())
const expansionInitialized = ref(false)
const isEditing = ref(false)
const formDirty = ref(false)
const deleteOpen = ref(false)
const departmentDeleteOpen = ref(false)
const discardOpen = ref(false)
let pendingAction: (() => void) | null = null

/** Not `filters.value.length > 0` — all three chips are always present now (inline, not
 *  behind the "+" menu), so the array is never actually empty. This is "does any chip
 *  currently hold a real value," the same meaning it had before. */
const hasActiveFilters = computed(
  () => search.value.trim() !== "" || departmentId.value !== null || visibility.value !== "all",
)
const hasActiveDepartmentFilters = computed(() => departmentSearch.value.trim() !== "")
const hasActiveBrandFilters = computed(() => brandSearch.value.trim() !== "")
const sortedTree = computed(() => sortCategoryTree(buildCategoryTree(categories.value), sort.value))
const filteredDepartments = computed(() => {
  const normalizedSearch = departmentSearch.value.trim().toLocaleLowerCase()
  const matching = departments.value.filter(candidate => {
    if (!normalizedSearch) return true
    return [candidate.nom, candidate.nom_court, candidate.slug].some(value =>
      value?.toLocaleLowerCase().includes(normalizedSearch),
    )
  })
  return sortDepartments(matching, departmentSort.value)
})
const filteredBrands = computed<Marque[]>(() => {
  const normalizedSearch = brandSearch.value.trim().toLocaleLowerCase()
  const matching = brands.value.filter(candidate => {
    if (!normalizedSearch) return true
    return (
      candidate.nom.toLocaleLowerCase().includes(normalizedSearch) ||
      candidate.slug.toLocaleLowerCase().includes(normalizedSearch)
    )
  })
  return sortBrands(matching, brandSort.value)
})
const filteredTree = computed(() =>
  filterCategoryTree(sortedTree.value, candidate => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      candidate.nom.toLocaleLowerCase().includes(normalizedSearch) ||
      candidate.slug.toLocaleLowerCase().includes(normalizedSearch)
    const matchesDepartment = departmentId.value === null || candidate.rayon === departmentId.value
    const matchesVisibility =
      visibility.value === "all" || (visibility.value === "visible" ? !candidate.masquee : candidate.masquee)
    return matchesSearch && matchesDepartment && matchesVisibility
  }),
)

function collectExpandedAncestorIds(nodes: ReturnType<typeof buildCategoryTree>): Set<number> {
  const ids = new Set<number>()
  const visit = (current: typeof nodes) => {
    for (const node of current) {
      if (node.children.length > 0) ids.add(node.category.id)
      visit(node.children)
    }
  }
  visit(nodes)
  return ids
}

const expandedIds = computed(() =>
  hasActiveFilters.value
    ? new Set([...manualExpandedIds.value, ...collectExpandedAncestorIds(filteredTree.value.nodes)])
    : manualExpandedIds.value,
)

watch(
  categories,
  next => {
    if (expansionInitialized.value || next.length === 0) return
    manualExpandedIds.value = new Set(
      buildCategoryTree(next)
        .filter(node => node.children.length > 0)
        .map(node => node.category.id),
    )
    expansionInitialized.value = true
  },
  { immediate: true },
)

function parseCategoryId(raw: string | (string | null)[] | null | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== "string") return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const selectedId = computed(() => parseCategoryId(route.query.category))
const isNewMode = computed(() => selectedId.value === null && route.query.new === "1")
const isPanelOpen = computed(() => selectedId.value !== null || isNewMode.value)
const selectedCategory = computed(() =>
  selectedId.value === null ? null : (categories.value.find(candidate => candidate.id === selectedId.value) ?? null),
)
function parseDepartmentId(raw: string | (string | null)[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === "string" && value.length > 0 && value !== "new" ? value : null
}

const selectedDepartmentId = computed(() => parseDepartmentId(route.query.department))
const isNewDepartmentMode = computed(() => route.query.department === "new")
const isDepartmentPanelOpen = computed(() => selectedDepartmentId.value !== null || isNewDepartmentMode.value)
const selectedDepartment = computed(() =>
  selectedDepartmentId.value === null
    ? null
    : (departments.value.find(candidate => candidate.id === selectedDepartmentId.value) ?? null),
)
function parseBrandSlug(raw: string | (string | null)[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === "string" && value.length > 0 ? value : null
}

const selectedBrandSlug = computed(() => parseBrandSlug(route.query.brand))
const isBrandPanelOpen = computed(() => selectedBrandSlug.value !== null)
const selectedBrand = computed(() =>
  selectedBrandSlug.value === null
    ? null
    : (brands.value.find(candidate => candidate.slug === selectedBrandSlug.value) ?? null),
)
const isPendingWrite = computed(
  () =>
    category.isPending.value ||
    create.isPending.value ||
    remove.isPending.value ||
    department.isPending.value ||
    createDepartment.isPending.value ||
    removeDepartment.isPending.value,
)

function clearFilters() {
  filters.value = neutralCategoryFilters()
}

function clearDepartmentFilters() {
  departmentFilters.value = [{ field: "q", operator: "contains", value: "" }]
}

function clearBrandFilters() {
  brandFilters.value = [{ field: "q", operator: "contains", value: "" }]
}

function toggleExpanded(id: number) {
  const next = new Set(manualExpandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  manualExpandedIds.value = next
}

function expandAll() {
  manualExpandedIds.value = collectExpandedAncestorIds(sortedTree.value)
}

function collapseAll() {
  manualExpandedIds.value = new Set()
}

function updateSort(key: "nom" | "compte_total") {
  sort.value =
    sort.value.key === key
      ? { key, direction: sort.value.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" }
}

function updateDepartmentSort(key: FlatTaxonomySort["key"]) {
  departmentSort.value =
    departmentSort.value.key === key
      ? { key, direction: departmentSort.value.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" }
}

function updateBrandSort(key: BrandSort["key"]) {
  brandSort.value =
    brandSort.value.key === key
      ? { key, direction: brandSort.value.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" }
}

function navigate(action: () => void) {
  if (!formDirty.value) {
    action()
    return
  }
  pendingAction = action
  discardOpen.value = true
}

function runPendingAction() {
  formDirty.value = false
  isEditing.value = false
  discardOpen.value = false
  pendingAction?.()
  pendingAction = null
}

function keepEditing() {
  discardOpen.value = false
  pendingAction = null
}

function clearPanelQuery() {
  void navigateTo({ path: route.path })
}

function selectCategory(id: number) {
  navigate(() => void navigateTo({ path: route.path, query: { category: String(id) } }))
}

function selectDepartment(id: string) {
  navigate(() => void navigateTo({ path: route.path, query: { department: id } }))
}

function selectBrand(slug: string) {
  navigate(() => void navigateTo({ path: route.path, query: { brand: slug } }))
}

function addCategory() {
  navigate(() => void navigateTo({ path: route.path, query: { new: "1" } }))
}

function addDepartment() {
  navigate(() => void navigateTo({ path: route.path, query: { department: "new" } }))
}

function closePanel() {
  navigate(clearPanelQuery)
}

function setActiveTab(value: string) {
  navigate(() => {
    const hadPanelOpen = isPanelOpen.value || isDepartmentPanelOpen.value || isBrandPanelOpen.value
    const changingTab = value !== activeTab.value
    activeTab.value = value
    if (changingTab && hadPanelOpen) clearPanelQuery()
  })
}

/* LES REFUS DE LA TAXONOMIE ÉTAIENT TOTALEMENT MUETS, et les panneaux
   attendaient pourtant une prop `error` que personne ne leur passait. « Le
   slug X est déjà pris », « ce parent est une descendante : le déplacement
   créerait un cycle » — le bouton se dégrisait, rien ne s'affichait, et
   l'opérateur recliquait. */
const erreurFormulaire = ref("")

/** `ApiErrorCard` prend l'erreur telle quelle ; le texte sert aux écrans qui n'en ont pas. */
const erreurBrute = ref<unknown>(null)

function surEchec(error: unknown) {
  erreurFormulaire.value = apiErrorText(error, t)
  erreurBrute.value = error
}

function submitForm(input: CategorieCreateInput | CategoriePatchInput) {
  erreurFormulaire.value = ""
  erreurBrute.value = null
  if (isNewMode.value) {
    create.mutate(input as CategorieCreateInput, {
      onSuccess: async created => {
        await refetch()
        formDirty.value = false
        void navigateTo({ path: route.path, query: { category: String(created.id) } })
      },
      onError: surEchec,
    })
    return
  }

  if (selectedId.value === null || Object.keys(input).length === 0) return
  category.mutate(
    { id: selectedId.value, input: input as CategoriePatchInput },
    {
      onSuccess: async () => {
        await refetch()
        formDirty.value = false
        isEditing.value = false
      },
      onError: surEchec,
    },
  )
}

function updateVisibility(value: boolean) {
  if (selectedId.value === null) return
  erreurFormulaire.value = ""
  erreurBrute.value = null
  category.mutate({ id: selectedId.value, input: { masquee: value } }, { onError: surEchec })
}

function submitDepartmentForm(input: RayonCreateInput | RayonPatchInput) {
  erreurFormulaire.value = ""
  erreurBrute.value = null
  if (isNewDepartmentMode.value) {
    createDepartment.mutate(input as RayonCreateInput, {
      onSuccess: async created => {
        await refetch()
        formDirty.value = false
        void navigateTo({ path: route.path, query: { department: created.id } })
      },
      onError: surEchec,
    })
    return
  }

  if (selectedDepartmentId.value === null || Object.keys(input).length === 0) return
  department.mutate(
    { id: selectedDepartmentId.value, input: input as RayonPatchInput },
    {
      onSuccess: async () => {
        await refetch()
        formDirty.value = false
        isEditing.value = false
      },
      onError: surEchec,
    },
  )
}

/**
 * LE GESTE DE RÉPARATION N'AVAIT PAS DE BOUTON. `recalculate` existait dans
 * `useTaxonomyMutations` et personne ne la déstructurait : quand un compteur
 * de produits ment — une catégorie déplacée, un produit retiré — il n'y avait
 * aucun moyen de le refaire calculer depuis le panneau.
 */
const recalculateOpen = ref(false)
const recalculateError = ref("")

function confirmRecalculate() {
  recalculateError.value = ""
  recalculate.mutate(undefined, {
    onSuccess: async () => {
      recalculateOpen.value = false
      toast.success(t("taxonomy.recalculate.toastSuccess"))
      await refetch()
    },
    onError: (error: unknown) => {
      recalculateOpen.value = false
      recalculateError.value = apiErrorText(error, t)
      toast.error(t("taxonomy.recalculate.toastError"), { description: recalculateError.value })
    },
  })
}

function confirmDelete() {
  if (selectedId.value === null) return
  remove.mutate(selectedId.value, {
    onSuccess: () => {
      deleteOpen.value = false
      closePanel()
    },
  })
}

function confirmDepartmentDelete() {
  if (selectedDepartmentId.value === null) return
  removeDepartment.mutate(selectedDepartmentId.value, {
    onSuccess: () => {
      departmentDeleteOpen.value = false
      closePanel()
    },
  })
}

const tabs = computed(() => [
  {
    value: "categories",
    label: t("taxonomy.tabs.categories"),
    icon: "ph:tree-structure",
    testid: "taxonomy-tab-categories",
  },
  {
    value: "departments",
    label: t("taxonomy.tabs.departments"),
    icon: "ph:storefront",
    testid: "taxonomy-tab-departments",
  },
  { value: "brands", label: t("taxonomy.tabs.brands"), icon: "ph:tag", testid: "taxonomy-tab-brands" },
])

useSeoMeta({
  title: () => t("taxonomy.seo.title"),
  description: () => t("taxonomy.seo.description"),
  ogTitle: () => t("taxonomy.seo.title"),
  ogDescription: () => t("taxonomy.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="-mx-6 lg:-mx-10">
    <div class="px-6">
      <AdminPageHeader :title="t('taxonomy.heading')">
        <template #tabs>
          <PillTabs
            :model-value="activeTab"
            :items="tabs"
            data-testid="taxonomy-tabs"
            @update:model-value="setActiveTab"
          />
        </template>
      </AdminPageHeader>
    </div>
    <template v-if="activeTab === 'categories'">
      <div class="px-6 bg-background border-b border-b-muted/70 sticky top-16 z-10">
        <TaxonomyCategoryToolbar
          v-model:filters="filters"
          :departments="departments"
          :can-write="canWrite"
          :has-active-filters="hasActiveFilters"
          @clear="clearFilters"
          @expand="expandAll"
          @collapse="collapseAll"
          @add="addCategory"
        >
          <template #actions>
            <TaxonomyRecalculateCountersAction
              :pending="recalculate.isPending.value"
              :error="recalculateError"
              @trigger="recalculateOpen = true"
            />
          </template>
        </TaxonomyCategoryToolbar>
      </div>
      <TaxonomyCategoryTreeTable
        :nodes="filteredTree.nodes"
        :expanded-ids="expandedIds"
        :matching-ids="filteredTree.matchingIds"
        :loading="isPending && !data"
        :error="error"
        :empty="categories.length === 0"
        :filtered="hasActiveFilters"
        :sort="sort"
        :can-write="canWrite"
        @select="selectCategory($event.id)"
        @toggle="toggleExpanded"
        @sort="updateSort"
        @retry="() => refetch()"
        @clear="clearFilters"
        @add="addCategory"
      />
      <TaxonomyCategoryDetailPanel
        :open="isPanelOpen"
        :category="selectedCategory"
        :categories="categories"
        :can-write="canWrite"
        :creating="isNewMode"
        :editing="isEditing"
        :dirty="formDirty"
        :pending="isPendingWrite"
        :not-found="selectedId !== null && selectedCategory === null && !isPending"
        :error="erreurBrute"
        @update:open="
          value => {
            if (!value) closePanel()
          }
        "
        @edit="isEditing = true"
        @cancel-edit="isEditing = false"
        @visibility="updateVisibility"
        @remove="deleteOpen = true"
      >
        <template #form>
          <TaxonomyCategoryForm
            :category="isNewMode ? null : selectedCategory"
            :categories="categories"
            :departments="departments"
            :pending="isPendingWrite"
            @dirty="formDirty = $event"
            @submit="submitForm"
          />
        </template>
      </TaxonomyCategoryDetailPanel>
      <TaxonomyDeleteCategoryDialog
        v-model:open="deleteOpen"
        :category="selectedCategory"
        :pending="remove.isPending.value"
        :error="remove.error.value"
        @confirm="confirmDelete"
      />
    </template>
    <template v-else-if="activeTab === 'departments'">
      <div class="px-6 bg-background border-b border-b-muted/70 sticky top-16 z-10">
        <TaxonomyDepartmentToolbar
          v-model:filters="departmentFilters"
          :can-write="canWrite"
          :has-active-filters="hasActiveDepartmentFilters"
          @clear="clearDepartmentFilters"
          @add="addDepartment"
        >
          <template #actions>
            <TaxonomyRecalculateCountersAction
              :pending="recalculate.isPending.value"
              :error="recalculateError"
              @trigger="recalculateOpen = true"
            />
          </template>
        </TaxonomyDepartmentToolbar>
      </div>
      <TaxonomyDepartmentTable
        :departments="filteredDepartments"
        :sort="departmentSort"
        :loading="isPending && !data"
        :error="error"
        :empty="departments.length === 0"
        :filtered="hasActiveDepartmentFilters"
        :can-write="canWrite"
        @select="selectDepartment($event.id)"
        @sort="updateDepartmentSort"
        @retry="() => refetch()"
        @clear="clearDepartmentFilters"
        @add="addDepartment"
      />
      <TaxonomyDepartmentDetailPanel
        :open="isDepartmentPanelOpen"
        :department="selectedDepartment"
        :can-write="canWrite"
        :creating="isNewDepartmentMode"
        :editing="isEditing"
        :dirty="formDirty"
        :pending="isPendingWrite"
        :not-found="selectedDepartmentId !== null && selectedDepartment === null && !isPending"
        :error="erreurBrute"
        @update:open="
          value => {
            if (!value) closePanel()
          }
        "
        @edit="isEditing = true"
        @cancel-edit="isEditing = false"
        @remove="departmentDeleteOpen = true"
      >
        <template #form>
          <TaxonomyDepartmentForm
            :department="isNewDepartmentMode ? null : selectedDepartment"
            :pending="isPendingWrite"
            @dirty="formDirty = $event"
            @submit="submitDepartmentForm"
          />
        </template>
      </TaxonomyDepartmentDetailPanel>
      <TaxonomyDeleteDepartmentDialog
        v-model:open="departmentDeleteOpen"
        :department="selectedDepartment"
        :pending="removeDepartment.isPending.value"
        :error="removeDepartment.error.value"
        @confirm="confirmDepartmentDelete"
      />
    </template>
    <template v-else-if="activeTab === 'brands'">
      <div class="px-6 bg-background border-b border-b-muted/70 sticky top-16 z-10">
        <TaxonomyBrandToolbar
          v-model:filters="brandFilters"
          :can-write="canWrite"
          :has-active-filters="hasActiveBrandFilters"
          @clear="clearBrandFilters"
        >
          <template #actions>
            <TaxonomyRecalculateCountersAction
              :pending="recalculate.isPending.value"
              :error="recalculateError"
              @trigger="recalculateOpen = true"
            />
          </template>
        </TaxonomyBrandToolbar>
      </div>
      <TaxonomyBrandTable
        :brands="filteredBrands"
        :sort="brandSort"
        :loading="isPending && !data"
        :error="error"
        :empty="brands.length === 0"
        :filtered="hasActiveBrandFilters"
        @select="selectBrand($event.slug)"
        @sort="updateBrandSort"
        @retry="() => refetch()"
        @clear="clearBrandFilters"
      />
      <TaxonomyBrandDetailPanel
        :open="isBrandPanelOpen"
        :brand="selectedBrand"
        :not-found="selectedBrandSlug !== null && selectedBrand === null && !isPending"
        @update:open="
          value => {
            if (!value) closePanel()
          }
        "
      />
    </template>
    <AlertDialog
      :open="recalculateOpen"
      @update:open="
        value => {
          recalculateOpen = value
        }
      "
    >
      <AlertDialogContent data-testid="taxonomy-recalculate-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("taxonomy.recalculate.title") }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("taxonomy.recalculate.description") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" :disabled="recalculate.isPending.value" @click="recalculateOpen = false">
            {{ t("taxonomy.recalculate.cancel") }}
          </Button>
          <Button
            data-testid="taxonomy-recalculate-confirm"
            :disabled="recalculate.isPending.value"
            :aria-busy="recalculate.isPending.value ? true : undefined"
            @click="confirmRecalculate"
          >
            <Spinner v-if="recalculate.isPending.value" data-icon="inline-start" />
            {{ t("taxonomy.recalculate.confirm") }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog
      :open="discardOpen"
      @update:open="
        value => {
          if (!value) keepEditing()
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("taxonomy.discard.title") }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("taxonomy.discard.description") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" @click="keepEditing">
            {{ t("taxonomy.discard.keep") }}
          </Button>
          <Button variant="destructive" @click="runPendingAction">
            {{ t("taxonomy.discard.confirm") }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
