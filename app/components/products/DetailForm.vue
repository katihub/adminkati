<script setup lang="ts">
import type { ProduitCreateInput, ProduitUpdateInput } from "@/schemas/produit"
import type { ProductCopyField, ProductCopySuggestion, ProductCopyTarget } from "@/types/ai/product-copy"
import type { StatutForce } from "@/types/api/inventaire"
import type { ProductDetail } from "@/types/api/produits"
import type { ProductTab } from "@/types/product-tab"
import { computed, reactive, ref, toRef, useId, watch } from "vue"
import { useProductCopySuggestions } from "@/composables/useProductCopySuggestions"
import { useCreateProduit, useUpdateProduit, useUploadProduitImage } from "@/composables/useProduitMutations"
import { produitCreateSchema, produitUpdateSchema } from "@/schemas/produit"
import { useAiGenerationStore } from "@/stores/ai-generation"
import {
  buildProductCopyDraft,
  hasEnoughProductContext,
  toProductCopyCategoryChoices,
  toProductCopyDraftSource,
} from "@/utils/ai-product-copy"
import { apiErrorText } from "@/utils/api-error"
import { productFormSignature } from "@/utils/product-form-source"
import {
  deriveCategoryValues,
  deriveDeliveryValues,
  deriveDescriptionValues,
  deriveListValues,
  deriveNumericValues,
  derivePromoValues,
  deriveScalarValues,
} from "@/utils/product-form-values"
import { slugify } from "@/utils/slug"

const props = defineProps<{ product: ProductDetail | null }>()
const emit = defineEmits<{ cancel: []; saved: [product: ProductDetail] }>()
const product = toRef(props, "product")

/** Cap mirrors `produitSchema.caracteristiques` — the add control disables once reached. */
const CARACTERISTIQUE_CAP = 12

type FieldName =
  | "nom"
  | "prix"
  | "prix_reference"
  | "remise_pct"
  | "marque"
  | "categorie_principale_id"
  | "url_source"
  | "slug"
  | "images"
  | "caracteristiques"
  | "description"
  | "fiche_technique"
  | "quantite_stock_initiale"

const FIELD_NAMES: FieldName[] = [
  "nom",
  "prix",
  "prix_reference",
  "remise_pct",
  "marque",
  "categorie_principale_id",
  "url_source",
  "slug",
  "images",
  "caracteristiques",
  "description",
  "fiche_technique",
  "quantite_stock_initiale",
]

const { t } = useI18n()

/** R5: add and edit are the same form — add just starts from a `null` product. */
const mode = computed<"add" | "edit">(() => (product.value ? "edit" : "add"))

const activeTab = ref<ProductTab>("overview")
/** The inventory queries start on the first visit to the Stock tab, not on every product open. */
const stockOpened = ref(false)
const showStock = computed(() => mode.value === "edit")
const stockPanelProductId = computed(() => (stockOpened.value ? (product.value?.id ?? null) : null))
watch(activeTab, tab => {
  if (tab === "stock") stockOpened.value = true
})
watch(
  () => product.value?.id,
  () => {
    stockOpened.value = false
  },
)

const historyCount = computed(() => product.value?.historique?.length ?? 0)
const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)
/** Comptoir is read-only, so its Stock tab has no action bar at all. */
/** Only staff who may adjust stock get the edit button on the Overview stock field. */
const stockEditProductId = computed(() => (canWrite.value ? product.value?.id : undefined))
const stockBarProductId = computed(() =>
  canWrite.value && activeTab.value === "stock" ? stockPanelProductId.value : null,
)
const resolvedDeliveryInterval = computed(() => product.value?.delai_livraison ?? null)

/**
 * LES FICHIERS CHOISIS AVANT QUE LE PRODUIT N'EXISTE.
 *
 * Téléverser une image demande un identifiant (`POST /produits/:id/images`),
 * et en création il n'y en a pas encore : le panneau ne proposait donc qu'une
 * URL, ce qui oblige à héberger l'image ailleurs d'abord. Les fichiers sont
 * désormais RETENUS ici, affichés par une URL `blob:` locale, et envoyés
 * juste après que la création a rendu l'identifiant.
 *
 * L'URL `blob:` NE PART JAMAIS AU SERVEUR : elle n'a de sens que dans cet
 * onglet, et le backend la refuserait. `buildRawPayload` la filtre.
 */
const fichiersEnAttente = new Map<string, File>()
const televersementEnCours = ref(false)

const createMutation = useCreateProduit()

/**
 * Envoie les fichiers retenus, une fois le produit créé et son identifiant
 * connu. Un échec de téléversement n'annule pas la création — le produit
 * existe, il lui manque une image, et c'est ce que dit le message.
 */

const values = reactive({
  nom: "",
  marque: null as string | null,
  delai_livraison_id: null as number | null,
  categorie_principale_id: null as number | null,
  categories_ids: [] as number[],
  url_source: "",
  caracteristiques: [] as string[],
  description: "",
  fiche_technique: "",
  images: [] as ProductDetail["images"],
  slug: "",
})
const numeric = reactive({ prix: "", prix_reference: "", remise_pct: "" })
/**
 * Create-only. Empty means the product is not counted; a quantity counts it and decides its status. An
 * existing product changes stock through the inventory panel.
 */
const initialStock = ref("")
/** Create-only: the status of a product that is not counted. */
const initialAvailability = ref<StatutForce>("en_stock")
/**
 * LA FENÊTRE DE LA PROMOTION, en date seule (« 2026-09-30 »).
 *
 * L'opérateur pense en jours, pas en instants : un champ `date` est ce qu'il
 * attend. Le backend, lui, exige de l'ISO-8601 complet — d'où la conversion
 * à l'envoi, et seulement là. La garder en interne au format du champ évite
 * qu'un aller-retour décale la date d'un jour selon le fuseau.
 */
const promo = reactive({ debut: "", fin: "" })

const caracteristiqueInput = ref("")
const activeDepartmentValue = ref<string | null>(product.value?.rayon ?? null)
const initialSnapshot = ref("")

const errorKeys = reactive<Record<FieldName, string>>({
  nom: "",
  prix: "",
  prix_reference: "",
  remise_pct: "",
  marque: "",
  categorie_principale_id: "",
  url_source: "",
  slug: "",
  images: "",
  caracteristiques: "",
  description: "",
  fiche_technique: "",
  quantite_stock_initiale: "",
})
const submitError = ref("")

const updateMutation = useUpdateProduit(computed(() => product.value?.id ?? 0))

const isSaving = computed(
  () =>
    televersementEnCours.value ||
    (mode.value === "add" ? createMutation.isPending.value : updateMutation.isPending.value),
)
/* L'identifiant de la cible du téléversement est posé APRÈS la création :
   la mutation lit une source, pas une valeur figée à la construction. */
const idPourTeleversement = ref(0)
const uploadMutation = useUploadProduitImage(() => idPourTeleversement.value)

/**
 * Retient un fichier choisi avant la création et l'affiche tout de suite.
 * L'aperçu passe par une URL `blob:`, reconnaissable et filtrée du payload :
 * elle ne vaut que dans cet onglet.
 */
function retenirFichier(fichier: File) {
  const apercu = URL.createObjectURL(fichier)
  fichiersEnAttente.set(apercu, fichier)
  values.images = [
    ...values.images,
    {
      rang: values.images.length + 1,
      url: apercu,
      chemin_local: null,
      octets: fichier.size,
      alt: null,
    },
  ]
}

async function envoyerFichiersEnAttente(produit: ProductDetail): Promise<ProductDetail> {
  if (fichiersEnAttente.size === 0) return produit

  idPourTeleversement.value = produit.id
  televersementEnCours.value = true
  let dernier = produit
  const echecs: string[] = []
  for (const [url, fichier] of fichiersEnAttente) {
    try {
      dernier = await uploadMutation.mutateAsync(fichier)
    } catch {
      echecs.push(fichier.name)
    }
    URL.revokeObjectURL(url)
  }
  fichiersEnAttente.clear()
  televersementEnCours.value = false
  if (echecs.length) submitError.value = t("products.imageGallery.uploadPartialFailure", { files: echecs.join(", ") })
  return dernier
}

function createFormSnapshot() {
  return JSON.stringify({
    values: {
      ...values,
      categories_ids: [...values.categories_ids],
      caracteristiques: [...values.caracteristiques],
      images: values.images.map(image => ({ ...image })),
    },
    numeric: { ...numeric },
    initialStock: initialStock.value,
    initialAvailability: initialAvailability.value,
    promo: { ...promo },
    caracteristiqueInput: caracteristiqueInput.value.trim(),
  })
}

/** Once the user edits the slug directly, name changes stop overwriting it. */
const slugTouched = ref(false)

/** Populates from `product`, or clears when it's `null` — the same function drives both
 *  the initial mount (add vs. edit) and Cancel's "reset to what was loaded" behavior. */
function applyProduct(current: ProductDetail | null) {
  Object.assign(
    values,
    deriveScalarValues(current),
    deriveDescriptionValues(current),
    deriveDeliveryValues(current),
    deriveCategoryValues(current),
    deriveListValues(current),
    { slug: "" },
  )
  Object.assign(numeric, deriveNumericValues(current))
  initialStock.value = ""
  initialAvailability.value = "en_stock"
  Object.assign(promo, derivePromoValues(current))
  caracteristiqueInput.value = ""
  activeDepartmentValue.value = current?.rayon ?? null
  slugTouched.value = false
  initialSnapshot.value = createFormSnapshot()
}

applyProduct(product.value)
watch(
  () => productFormSignature(product.value),
  () => {
    applyProduct(product.value)
    activeTab.value = "overview"
  },
)

/** R5's add-mode slug field mirrors the name until the user overrides it themselves. */
watch(
  () => values.nom,
  name => {
    if (mode.value === "add" && !slugTouched.value) values.slug = slugify(name)
  },
)

function updateSlug(value: string) {
  slugTouched.value = true
  values.slug = value
}

const isDirty = computed(() => createFormSnapshot() !== initialSnapshot.value)

function clearFieldErrors() {
  for (const field of FIELD_NAMES) errorKeys[field] = ""
}

function applyFieldErrors(keys: Record<string, string>) {
  for (const field of FIELD_NAMES) errorKeys[field] = keys[field] ?? ""
}

/**
 * An amount as people write it, not as `Number()` reads it.
 *
 * This silently blocked product creation. `Number("45 000")` is `NaN`, so a
 * price typed the French way — or pasted as "45 000 FCFA", or left in the
 * thousands-grouped form this very field displays once it loses focus — failed
 * validation and the create request was never sent. Reproduced: "45000" posted,
 * "45 000", the same with a non-breaking space, and "45000 FCFA" did not.
 *
 * Only grouping spaces and a trailing currency are dropped. `\s` already
 * covers the non-breaking and narrow no-break spaces `toLocaleString("fr")`
 * produces, so no invisible character has to live in this source file.
 * Anything else stays as typed, so a genuinely wrong value like "45,5" still
 * fails validation and is reported instead of being guessed at.
 */
function normalizeAmount(raw: string): string {
  return raw.replace(/\s/g, "").replace(/(?:fcfa|xaf|f)$/i, "")
}

function parseRequiredNumber(raw: string): number | undefined {
  const trimmed = normalizeAmount(raw)
  return trimmed === "" ? undefined : Number(trimmed)
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = normalizeAmount(raw)
  return trimmed === "" ? null : Number(trimmed)
}

function parseEditableNumber(raw: string): number | null {
  const trimmed = normalizeAmount(raw)
  if (trimmed === "") return null

  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function calculateDiscount(priceRaw: string, referencePriceRaw: string): number | null {
  const price = parseEditableNumber(priceRaw)
  const referencePrice = parseEditableNumber(referencePriceRaw)
  if (price === null || referencePrice === null || referencePrice <= 0) return null

  return Math.min(100, Math.max(0, Math.round(((referencePrice - price) / referencePrice) * 100)))
}

/**
 * LA REMISE SUIT LE PRIX, Y COMPRIS QUAND ELLE N'EXISTE PLUS.
 *
 * Elle ne le suivait qu'à moitié : le `if` gardait l'ancienne remise dès que
 * le calcul échouait — prix vidé, référence vidée, référence à zéro. On
 * lisait alors « 15 % » sous deux champs qui ne portent plus de promotion, et
 * les trois champs se contredisaient à l'écran alors que le formulaire
 * existe précisément pour qu'ils ne se contredisent jamais.
 *
 * `updateReferencePrice` efface déjà dans ce cas ; les deux entrées doivent
 * se comporter pareil, sans quoi la cohérence dépend du champ par lequel
 * l'opérateur est passé.
 */
function updatePrice(value: string) {
  numeric.prix = value
  const discount = calculateDiscount(value, numeric.prix_reference)
  numeric.remise_pct = discount === null ? "" : String(discount)
}

function isValidDiscount(discount: number | null): boolean {
  return discount !== null && discount >= 0 && discount <= 100
}

function computeDiscountedPrice(referencePrice: number | null, discount: number | null): string | null {
  if (referencePrice === null || referencePrice < 0 || !isValidDiscount(discount)) return null
  return String(Math.round(referencePrice * (1 - discount! / 100)))
}

/**
 * LE PRIX BARRÉ NE DÉPLACE PAS LE PRIX DE VENTE — il recalcule la remise.
 *
 * Il le déplaçait : changer la référence gardait la remise fixe et recalculait
 * `prix`. Autrement dit, un opérateur qui voulait seulement corriger le prix
 * barré changeait SANS LE VOULOIR ce que le client paie. C'est le mauvais sens
 * de la dépendance : le prix de vente est une décision, la remise en est la
 * conséquence.
 *
 * ET C'EST CE QUE LA BASE FERA DE TOUTE FAÇON. Le backend recalcule la remise
 * à partir des deux prix et écrase celle qu'on lui envoie — son commentaire le
 * dit en propres termes : « elle ne peut être que redondante ou fausse »
 * (`administration.service.ts`). Afficher autre chose ici serait promettre un
 * enregistrement qui n'aura pas lieu.
 */
function updateReferencePrice(value: string) {
  numeric.prix_reference = value
  const discount = calculateDiscount(numeric.prix, value)
  numeric.remise_pct = discount === null ? "" : String(discount)
}

/**
 * LA RÈGLE QUE LA BASE APPLIQUERA, DITE AVANT D'ENREGISTRER. Une référence
 * inférieure ou égale au prix n'est pas une promotion, c'est une faute de
 * saisie : le backend la refuse en 400. La voir au moment où on la commet
 * vaut mieux que la lire après un aller-retour.
 */
const promotionIncoherente = computed(() => {
  const prix = parseEditableNumber(numeric.prix)
  const reference = parseEditableNumber(numeric.prix_reference)
  return prix !== null && reference !== null && reference > 0 && reference <= prix
})

function updateDiscount(value: string) {
  numeric.remise_pct = value
  const discounted = computeDiscountedPrice(parseEditableNumber(numeric.prix_reference), parseEditableNumber(value))
  if (discounted !== null) numeric.prix = discounted
}

// fallow-ignore-next-line complexity
function buildRawPayload(): Record<string, unknown> {
  return {
    nom: values.nom,
    prix: parseRequiredNumber(numeric.prix),
    prix_reference: parseOptionalNumber(numeric.prix_reference),
    remise_pct: parseOptionalNumber(numeric.remise_pct),
    /* LA FIN COUVRE LA JOURNÉE ENTIÈRE. Poser « 30 septembre » et voir la
       remise tomber à minuit le 30 au matin serait un jour perdu que
       personne n'a demandé : la borne part donc à 23:59:59 locale. */
    promo_debut: promo.debut ? new Date(`${promo.debut}T00:00:00`).toISOString() : null,
    promo_fin: promo.fin ? new Date(`${promo.fin}T23:59:59`).toISOString() : null,
    marque: values.marque?.trim() ? values.marque.trim() : null,
    delai_livraison_id: values.delai_livraison_id,
    categorie_principale_id: values.categorie_principale_id,
    categories_ids: values.categories_ids,
    url_source: values.url_source.trim() ? values.url_source.trim() : null,
    caracteristiques: values.caracteristiques,
    description: values.description.trim() ? values.description.trim() : null,
    fiche_technique: values.fiche_technique.trim() ? values.fiche_technique.trim() : null,
    images: values.images
      .filter(image => !image.url.startsWith("blob:"))
      .map(image => ({ url: image.url, alt: image.alt ?? undefined })),
    ...(mode.value === "add" && values.slug.trim() ? { slug: values.slug.trim() } : {}),
    ...(mode.value === "add" ? createStockFields() : {}),
  }
}

/** A quantity counts the product and decides its status; without one, only Out of stock needs sending (in stock is the default). */
function createStockFields() {
  const quantity = parseRequiredNumber(initialStock.value)
  if (quantity !== undefined) return { quantite_stock_initiale: quantity }
  return initialAvailability.value === "rupture" ? { disponibilite_forcee: "rupture" } : {}
}

/**
 * Field → the label the operator actually sees next to that input. Falls back
 * to the raw field name rather than showing nothing.
 */
const FIELD_LABEL_KEYS: Record<FieldName, string> = {
  nom: "products.detailForm.nom.label",
  prix: "products.detailForm.prix.label",
  prix_reference: "products.detailForm.prixReference.label",
  remise_pct: "products.detailForm.remisePct.label",
  marque: "products.overview.brand",
  categorie_principale_id: "products.overview.primaryCategory",
  url_source: "products.detailForm.urlSource.label",
  slug: "products.detailForm.slug.label",
  images: "products.detailForm.images.label",
  caracteristiques: "products.detailForm.caracteristiques.label",
  description: "products.detailForm.description.label",
  fiche_technique: "products.overview.longDescriptionTitle",
  quantite_stock_initiale: "products.detailForm.initialStock.label",
}

function onSubmit() {
  /* EVERY EARLY RETURN BELOW NOW SAYS WHY. They used to return silently: no
     request, no console error, and — for a validation failure — a switch to an
     "edit" tab that no longer exists in this template, which hid the whole
     form. The operator saw an empty panel and a backend that was never called. */
  if (!canWrite.value) {
    submitError.value = t("products.detailForm.readOnly")
    return
  }

  addCaracteristique()
  if (!isDirty.value) return

  const result = (mode.value === "add" ? produitCreateSchema : produitUpdateSchema).safeParse(buildRawPayload())

  if (!result.success) {
    const keys = toFieldErrorKeys(result.error)
    applyFieldErrors(keys)
    const fields = FIELD_NAMES.filter(field => keys[field]).map(field => t(FIELD_LABEL_KEYS[field]))
    submitError.value = t("products.detailForm.invalid", { fields: fields.join(", ") })
    /* Only the initial quantity renders its own `errorKeys` entry so far; the
       summary above is what tells the operator about the other fields. */
    activeTab.value = "overview"
    return
  }

  if (promotionIncoherente.value) {
    submitError.value = t("products.overview.promoIncoherente")
    activeTab.value = "overview"
    return
  }

  clearFieldErrors()
  submitError.value = ""

  const callbacks = {
    onSuccess: (saved: ProductDetail) => {
      // Les fichiers retenus pendant la création partent maintenant : le
      // produit a enfin l'identifiant que la route d'images réclame.
      void envoyerFichiersEnAttente(saved).then(apres => {
        emit("saved", apres)
        activeTab.value = "overview"
      })
    },
    onError: (error: unknown) => {
      submitError.value = apiErrorText(error, t)
    },
  }

  if (mode.value === "add") createMutation.mutate(result.data as ProduitCreateInput, callbacks)
  else updateMutation.mutate(result.data as ProduitUpdateInput, callbacks)
}

function onCancel() {
  productCopy.release()
  applyProduct(product.value)
  clearFieldErrors()
  submitError.value = ""
  activeTab.value = "overview"
  emit("cancel")
}

function addCaracteristique() {
  const value = caracteristiqueInput.value.trim()
  if (!value || values.caracteristiques.length >= CARACTERISTIQUE_CAP) return
  values.caracteristiques.push(value)
  caracteristiqueInput.value = ""
}

function removeCaracteristique(index: number) {
  values.caracteristiques.splice(index, 1)
}

const caracteristiqueCapReached = computed(() => values.caracteristiques.length >= CARACTERISTIQUE_CAP)
const caracteristiqueInputDisabled = computed(() => !canWrite.value || caracteristiqueCapReached.value)

const initialStockError = computed(() =>
  errorKeys.quantite_stock_initiale ? t(errorKeys.quantite_stock_initiale) : "",
)

function updateInitialStock(value: string) {
  initialStock.value = value
  errorKeys.quantite_stock_initiale = ""
  // A quantity decides the status, so a status picked beforehand no longer applies.
  if (value.trim() !== "") initialAvailability.value = "en_stock"
}

const overviewInitialStockId = useId()
const overviewLongDescriptionInputId = useId()
const overviewCaracteristiqueInputId = useId()
const overviewDescriptionInputId = useId()

const categoryOpen = ref(false)
const { data: taxonomie } = useTaxonomie()
const categories = computed(() => taxonomie.value?.categories ?? [])
const departments = computed(() => taxonomie.value?.rayons ?? [])
const brands = computed(() => taxonomie.value?.marques ?? [])

const newProductToken = useId()
const aiGeneration = useAiGenerationStore()
const copyTarget = computed<ProductCopyTarget>(() =>
  product.value ? { kind: "product", id: product.value.id } : { kind: "new", token: newProductToken },
)
const copyDraft = computed(() =>
  buildProductCopyDraft(
    toProductCopyDraftSource(
      {
        name: values.nom,
        brand: values.marque,
        departmentSlug: activeDepartmentValue.value,
        primaryCategoryId: values.categorie_principale_id,
        secondaryCategoryIds: values.categories_ids,
        price: parseEditableNumber(numeric.prix),
        shortDescription: values.description,
        longDescription: values.fiche_technique,
        features: values.caracteristiques,
      },
      { departments: departments.value, categories: categories.value },
    ),
  ),
)
const copyImageSignature = computed(() =>
  JSON.stringify(
    [...values.images]
      .sort((first, second) => first.rang - second.rang)
      .map(image => ({ rang: image.rang, url: image.url })),
  ),
)
// With a department already chosen, and not itself up for suggestion, only its categories are worth offering.
const copyCategoryChoices = computed(() =>
  toProductCopyCategoryChoices(
    categories.value,
    aiGeneration.preferredFields.includes("department") ? null : activeDepartmentValue.value,
  ),
)
/** A closed-list field is only worth asking for once its list has loaded. */
const copyFields = computed(() => {
  const available = aiGeneration.preferredFields.filter(field => {
    if (field === "brand") return brands.value.length > 0
    if (field === "department") return departments.value.length > 0
    if (field === "primaryCategory" || field === "secondaryCategories") return copyCategoryChoices.value.length > 0
    return true
  })
  return available.length ? available : aiGeneration.preferredFields
})
const copyNeedsContext = computed(
  () =>
    !hasEnoughProductContext(
      copyDraft.value,
      product.value !== null,
      copyFields.value,
      product.value?.images.length ?? 0,
    ),
)
const productCopy = useProductCopySuggestions({
  target: copyTarget,
  imageSignature: copyImageSignature,
  buildRequest: language => ({
    language,
    ...(product.value ? { productId: product.value.id } : {}),
    fields: copyFields.value,
    imageProfile: aiGeneration.preferredImageProfile,
    ...(copyFields.value.includes("brand") ? { brands: brands.value.map(brand => brand.nom) } : {}),
    ...(copyFields.value.includes("department")
      ? { departments: departments.value.map(department => ({ slug: department.slug, name: department.nom })) }
      : {}),
    ...(copyFields.value.some(field => field === "primaryCategory" || field === "secondaryCategories")
      ? { categories: copyCategoryChoices.value }
      : {}),
    draft: copyDraft.value,
  }),
  applyAll: pending => {
    if (!canWrite.value) return
    for (const apply of Object.values(copyAppliers)) apply(pending)
  },
})
const { suggestions: copySuggestions, isGenerating: copyGenerating, isGeneratingForTarget } = productCopy
// A reader never sees a card, even if a result is pending, because Apply would write to a locked form.
const copyCards = computed(() => (canWrite.value ? copySuggestions.value : {}))
const copyFieldsGenerating = computed(() => canWrite.value && isGeneratingForTarget.value)
const generatingChoiceFields = computed(() => (copyFieldsGenerating.value ? copyFields.value : []))
const brandGenerating = computed(() => generatingChoiceFields.value.includes("brand"))

const copyAppliers: Record<ProductCopyField, (pending: Partial<ProductCopySuggestion>) => void> = {
  name: ({ name }) => {
    if (name !== undefined) values.nom = name
  },
  brand: ({ brand }) => {
    if (brand !== undefined) values.marque = brand
  },
  department: ({ department }) => {
    if (department !== undefined) activeDepartmentValue.value = department
  },
  primaryCategory: ({ primaryCategory }) => {
    if (primaryCategory !== undefined) values.categorie_principale_id = primaryCategory
  },
  secondaryCategories: ({ secondaryCategories }) => {
    if (secondaryCategories) values.categories_ids = [...secondaryCategories]
  },
  shortDescription: ({ shortDescription }) => {
    if (shortDescription !== undefined) values.description = shortDescription
  },
  longDescription: ({ longDescription }) => {
    if (longDescription !== undefined) values.fiche_technique = longDescription
  },
  features: ({ features }) => {
    if (features) values.caracteristiques = [...features]
  },
}

function applyCopy(field: ProductCopyField) {
  copyAppliers[field](copySuggestions.value)
  productCopy.settle(field, "applied")
}

watch(
  () => product.value?.rayon,
  rayon => {
    activeDepartmentValue.value = rayon ?? null
  },
)
</script>

<template>
  <div class="space-y-6">
    <form data-testid="products-detail-form" class="flex flex-col" novalidate @submit.prevent="onSubmit">
      <ProductsDetailHeader
        :product-name="product?.nom"
        :history-count="historyCount"
        :active-tab="activeTab"
        :show-stock="showStock"
        @update:active-tab="value => (activeTab = value)"
      >
        <template #actions>
          <ProductsProductCopySuggestionTrigger
            :can-write="canWrite"
            :busy="copyGenerating"
            :needs-context="copyNeedsContext"
            @generate="productCopy.generate"
            @fresh-alternative="productCopy.generateFresh"
          />
          <ProductsDetailActionButtons
            :mode="mode"
            :can-write="canWrite"
            :is-saving="isSaving"
            :is-dirty="isDirty"
            :product="product"
            @cancel="onCancel"
          />
        </template>
        <template v-if="stockBarProductId !== null" #bar>
          <ProductsInventoryActionBar :product-id="stockBarProductId" />
        </template>
        <template v-if="submitError" #error>
          <p data-testid="products-detail-form-submit-error" role="alert" class="pt-2 text-sm text-destructive">
            {{ submitError }}
          </p>
        </template>
      </ProductsDetailHeader>

      <!-- Product details UI: hero + pill tabs, shared verbatim between add and edit (R5) —
           only field values/editability differ, the shape never does. -->
      <div class="space-y-6 px-4 pt-4 pb-6">
        <div v-show="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <ProductsOverviewMedia
              :images="values.images"
              :product-id="product?.id ?? null"
              :brand="values.marque"
              :brands="brands"
              :generating="brandGenerating"
              :mode="mode"
              :slug="values.slug"
              :disabled="!canWrite"
              :fiche-pdf="product?.fiche_pdf ?? null"
              :fiche-pdf-nom="product?.fiche_pdf_nom ?? null"
              :fiche-pdf-octets="product?.fiche_pdf_octets ?? null"
              @update:images="value => (values.images = value)"
              @stage-local="retenirFichier"
              @update:brand="value => (values.marque = value)"
              @update:slug="updateSlug"
            >
              <template #brand-suggestion>
                <ProductsProductCopySuggestionCard
                  field="brand"
                  :suggestions="copyCards"
                  @apply="applyCopy('brand')"
                  @dismiss="productCopy.settle('brand', 'dismissed')"
                />
              </template>
              <template #after-brand>
                <ProductsOverviewDescriptions
                  :descriptions="values.caracteristiques"
                  :draft="caracteristiqueInput"
                  :input-id="overviewCaracteristiqueInputId"
                  :disabled="!canWrite"
                  :draft-disabled="caracteristiqueInputDisabled"
                  :generating="copyFieldsGenerating"
                  @update:description="(index, value) => (values.caracteristiques[index] = value)"
                  @update:draft="value => (caracteristiqueInput = value)"
                  @add="addCaracteristique"
                  @remove="removeCaracteristique"
                >
                  <template #suggestion>
                    <ProductsProductCopySuggestionCard
                      field="features"
                      :suggestions="copyCards"
                      @apply="applyCopy('features')"
                      @dismiss="productCopy.settle('features', 'dismissed')"
                    />
                  </template>
                </ProductsOverviewDescriptions>
              </template>
            </ProductsOverviewMedia>

            <ProductsOverviewDetails
              :name="values.nom"
              :price="numeric.prix"
              :reference-price="numeric.prix_reference"
              :discount="numeric.remise_pct"
              :promotion-incoherente="promotionIncoherente"
              :promo-debut="promo.debut"
              :promo-fin="promo.fin"
              :disabled="!canWrite"
              :delivery-interval-id="values.delai_livraison_id"
              :resolved-delivery-interval="resolvedDeliveryInterval"
              :categories="categories"
              :selected-category-id="values.categorie_principale_id"
              :category-open="categoryOpen"
              :secondary-category-ids="values.categories_ids"
              :departments="departments"
              :active-department-value="activeDepartmentValue"
              :short-description="values.description"
              :short-description-input-id="overviewDescriptionInputId"
              :long-description="values.fiche_technique"
              :long-description-input-id="overviewLongDescriptionInputId"
              :generating="copyFieldsGenerating"
              :generating-fields="generatingChoiceFields"
              @update:name="value => (values.nom = value)"
              @update:price="updatePrice"
              @update:reference-price="updateReferencePrice"
              @update:discount="updateDiscount"
              @update:promo-debut="value => (promo.debut = value)"
              @update:promo-fin="value => (promo.fin = value)"
              @update:delivery-interval-id="value => (values.delai_livraison_id = value)"
              @update:category-open="value => (categoryOpen = value)"
              @select-category="value => (values.categorie_principale_id = value)"
              @update:secondary-category-ids="value => (values.categories_ids = value)"
              @update:active-department-value="value => (activeDepartmentValue = value)"
              @update:short-description="value => (values.description = value)"
              @update:long-description="value => (values.fiche_technique = value)"
            >
              <template #name-suggestion>
                <ProductsProductCopySuggestionCard
                  field="name"
                  :suggestions="copyCards"
                  @apply="applyCopy('name')"
                  @dismiss="productCopy.settle('name', 'dismissed')"
                />
              </template>
              <template #department-suggestion>
                <ProductsProductCopySuggestionCard
                  field="department"
                  :suggestions="copyCards"
                  @apply="applyCopy('department')"
                  @dismiss="productCopy.settle('department', 'dismissed')"
                />
              </template>
              <template #category-suggestion>
                <ProductsProductCopySuggestionCard
                  field="primaryCategory"
                  :suggestions="copyCards"
                  @apply="applyCopy('primaryCategory')"
                  @dismiss="productCopy.settle('primaryCategory', 'dismissed')"
                />
              </template>
              <template #secondary-categories-suggestion>
                <ProductsProductCopySuggestionCard
                  field="secondaryCategories"
                  :suggestions="copyCards"
                  @apply="applyCopy('secondaryCategories')"
                  @dismiss="productCopy.settle('secondaryCategories', 'dismissed')"
                />
              </template>
              <template #short-description-suggestion>
                <ProductsProductCopySuggestionCard
                  field="shortDescription"
                  :suggestions="copyCards"
                  @apply="applyCopy('shortDescription')"
                  @dismiss="productCopy.settle('shortDescription', 'dismissed')"
                />
              </template>
              <template #long-description-suggestion>
                <ProductsProductCopySuggestionCard
                  field="longDescription"
                  :suggestions="copyCards"
                  @apply="applyCopy('longDescription')"
                  @dismiss="productCopy.settle('longDescription', 'dismissed')"
                />
              </template>
              <template #stock-indicator>
                <ProductsOverviewStockIndicator :inventory="product?.inventaire" :product-id="stockEditProductId" />
              </template>
              <template v-if="mode === 'add'" #initial-stock>
                <ProductsOverviewInitialStock
                  v-model:availability="initialAvailability"
                  :model-value="initialStock"
                  :input-id="overviewInitialStockId"
                  :disabled="!canWrite"
                  :error="initialStockError"
                  @update:model-value="updateInitialStock"
                />
              </template>
            </ProductsOverviewDetails>
          </div>

          <ProductsDetailActions v-if="product?.retire_le" :product="product" />
        </div>

        <ProductsInventoryPanel
          v-if="stockPanelProductId !== null"
          v-show="activeTab === 'stock'"
          :product-id="stockPanelProductId"
        />

        <ProductsHistoryTab v-show="activeTab === 'history'" :product="product" :can-write="canWrite" />
      </div>
    </form>
  </div>
</template>
