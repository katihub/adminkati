<script setup lang="ts">
import type { MarketplaceProductCorrection, MarketplaceProductFilters } from "@/types/api/catalogue-products"
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { useQuery } from "@tanstack/vue-query"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { apiErrorText } from "@/utils/api-error"
import { routeQueryId, routeQueryString, routeQueryUuid } from "@/utils/route-query"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })
defineI18nRoute({ paths: { en: "/products", fr: "/produits" } })
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
if (routeQueryId(route.query.id))
  await navigateTo({ path: localePath("/legacy-products"), query: { id: String(route.query.id) } }, { replace: true })
const session = useCachedSession()
const canEdit = computed(() => session.value?.roles.includes("direction") ?? false)
const selectedId = computed(() => routeQueryUuid(route.query.id))
const creating = computed(() => route.query.new === "1" && canEdit.value)
const editing = ref(false)
const dirty = ref(false)
const corrections = useCatalogueCorrections()
const locked = ref(false)
const saving = computed(() => locked.value || corrections.product.isPending.value || corrections.create.isPending.value)
const maySave = computed(() => canEdit.value && !saving.value)
const guard = useCatalogueDraftGuard(dirty, saving)
const search = ref(routeQueryString(route.query.q) ?? "")
const statuses = [
  "brouillon",
  "soumis",
  "en_verification",
  "modification_demandee",
  "actif",
  "refuse",
  "suspendu",
  "archive",
]
const filters = computed<MarketplaceProductFilters>(() => ({
  recherche: routeQueryString(route.query.q),
  categorieId: routeQueryUuid(route.query.categorie) ?? undefined,
  statut: statuses.includes(String(route.query.statut)) ? String(route.query.statut) : undefined,
  page: Math.min(10000, routeQueryId(route.query.page) ?? 1),
  taille: 30,
}))
const list = useMarketplaceProducts(filters)
const detail = useMarketplaceProduct(selectedId)
const api = useApiFetch()
const categories = useQuery<MarketplaceCategory[]>({
  queryKey: ["v1", "marketplace", "categories", "edition-produits"],
  queryFn: () => api("/marketplace/categories/administration"),
  enabled: computed(() => canEdit.value && (editing.value || creating.value)),
})
const publicCategories = useQuery<MarketplaceCategory[]>({
  queryKey: ["v1", "marketplace", "categories", "publiques"],
  queryFn: () => api("/marketplace/categories"),
})
const selectedProduct = computed(() => detail.data.value?.produit ?? null)
const editableCategories = computed(() => categories.data.value ?? [])
const saveMessage = computed(() => t(creating.value ? "catalogue.created" : "catalogue.saved"))
const editor = computed(() => ({
  product: creating.value ? null : selectedProduct.value,
  categories: editableCategories.value,
  loading: categories.isPending.value,
  error: categories.error.value,
  saveError: creating.value ? corrections.create.error.value : corrections.product.error.value,
  saving: saving.value,
}))
watch(
  () => route.query.q,
  value => {
    search.value = routeQueryString(value) ?? ""
  },
)
watch(selectedId, () => {
  editing.value = false
  dirty.value = false
})
function updateQuery(changes: Record<string, string | undefined>) {
  void navigateTo({ path: route.path, query: { ...route.query, ...changes } })
}
function select(id: string) {
  updateQuery({ id, new: undefined })
}
function back() {
  guard.request(() => {
    editing.value = false
    updateQuery({ id: undefined, new: undefined })
  })
}
function applySearch() {
  updateQuery({ q: search.value.trim() || undefined, page: undefined, id: undefined })
}
function optionalText(value: string | null) {
  return value ?? undefined
}
function createProduct(body: MarketplaceProductCorrection & { slug?: string }) {
  return corrections.create.mutateAsync({
    nom: body.nom,
    slug: body.slug ?? "",
    categorieId: body.categorieId,
    marque: optionalText(body.marque),
    description: optionalText(body.description),
    descriptionCourte: optionalText(body.descriptionCourte),
    ficheTechnique: optionalText(body.ficheTechnique),
  })
}
function cancelEdit() {
  guard.request(() => {
    editing.value = false
    if (creating.value) back()
  })
}
async function save(body: MarketplaceProductCorrection & { slug?: string }) {
  if (!maySave.value) return
  locked.value = true
  let createdId: string | undefined
  try {
    createdId = await persistProduct(body)
    dirty.value = false
    editing.value = false
    toast.success(saveMessage.value)
  } catch (error) {
    toast.error(apiErrorText(error, t))
  } finally {
    locked.value = false
  }
  if (createdId) select(createdId)
}
async function persistProduct(body: MarketplaceProductCorrection & { slug?: string }) {
  if (creating.value) return (await createProduct(body)).id
  if (!selectedId.value) throw new Error(t("catalogue.empty"))
  await corrections.product.mutateAsync({ id: selectedId.value, body })
  return undefined
}
useSeoMeta({
  title: () => t("catalogue.title"),
  description: () => t("catalogue.description"),
  ogTitle: () => t("catalogue.title"),
  ogDescription: () => t("catalogue.description"),
})
</script>
<template>
  <div class="flex min-w-0 flex-col gap-5 py-4" data-testid="marketplace-products-page">
    <TeamDiscardDialog
      :open="guard.open.value"
      @update:open="value => !value && guard.cancel()"
      @confirm="guard.confirm"
    />
    <AdminPageHeader :title="t('catalogue.title')"
      ><p>{{ t("catalogue.description") }}</p>
      <template #actions
        ><Button v-if="canEdit" data-testid="catalogue-new-product" @click="updateQuery({ new: '1', id: undefined })"
          ><Icon name="ph:plus" data-icon="inline-start" />{{ t("catalogue.new") }}</Button
        ></template
      ></AdminPageHeader
    >
    <nav class="flex flex-wrap gap-4 text-sm font-medium text-primary">
      <NuxtLinkLocale v-if="canEdit" to="/operations?tab=marketplace-offers">{{
        t("catalogue.offersTitle")
      }}</NuxtLinkLocale
      ><NuxtLinkLocale v-if="canEdit" to="/operations?tab=marketplace-catalogue">{{
        t("catalogue.moderation")
      }}</NuxtLinkLocale
      ><NuxtLinkLocale v-if="canEdit" to="/operations?tab=marketplace-categories">{{
        t("catalogue.categories")
      }}</NuxtLinkLocale
      ><NuxtLinkLocale to="/legacy-products">{{ t("catalogue.legacy") }}</NuxtLinkLocale>
    </nav>
    <CatalogueProductFilters
      v-model:search="search"
      :status="filters.statut"
      :category="filters.categorieId"
      :categories="publicCategories.data.value ?? []"
      @filter="changes => updateQuery({ ...changes, page: undefined, id: undefined })"
      @submit="applySearch"
    />
    <ApiErrorCard
      v-if="publicCategories.error.value"
      :error="publicCategories.error.value"
      @retry="publicCategories.refetch()"
    />
    <div class="grid min-w-0 gap-5 lg:grid-cols-2">
      <div :class="selectedId || creating ? 'hidden lg:block' : ''">
        <CatalogueProductList
          :products="list.data.value?.elements ?? []"
          :loading="list.isPending.value"
          :error="list.error.value"
          :pagination="list.data.value?.pagination"
          @select="select"
          @page="page => updateQuery({ page: String(page), id: undefined })"
          @retry="list.refetch()"
        />
      </div>
      <CatalogueProductSelection
        v-if="selectedId || creating"
        :key="selectedId ?? 'new'"
        :detail="detail.data.value"
        :error="detail.error.value"
        :loading="!!selectedId && detail.isPending.value"
        :creating="creating"
        :editing="editing"
        :can-edit="canEdit"
        :editor="editor"
        @retry="detail.refetch()"
        @retry-categories="categories.refetch()"
        @dirty="dirty = $event"
        @save="save"
        @cancel="cancelEdit"
        @edit="editing = true"
        @back="back"
      />
    </div>
  </div>
</template>
