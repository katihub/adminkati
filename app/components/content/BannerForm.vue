<script setup lang="ts">
import type { BanniereAdmin, EmplacementBanniere, ModifierBanniereInput, TonaliteBanniere } from "@/types/api/vitrine"
import type { Dimensions } from "@/utils/banner-artwork"
import type { z } from "zod/v4"
import { computed, reactive, ref, toRef, useId, watch } from "vue"
import { toast } from "vue-sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBanniereMutations } from "@/composables/useBanniereMutations"
import { BANNIERE_ALT_MAX_LENGTH, BANNIERE_ALT_MIN_LENGTH, banniereSchema } from "@/schemas/banniere"
import { apiErrorText } from "@/utils/api-error"
import { bannerEmplacement, storedMobileDimensions, validateBannerArtwork } from "@/utils/banner-artwork"

type BanniereFormValues = z.infer<typeof banniereSchema>
type FieldName = "libelle" | "description" | "action" | "alt" | "href"

const props = defineProps<{ banner: BanniereAdmin | null; formId: string }>()

const emit = defineEmits<{ cancel: []; saved: [banner: BanniereAdmin] }>()

const FIELD_NAMES: FieldName[] = ["libelle", "description", "action", "alt", "href"]
/** Every field a `PATCH` may carry. The artworks have their own routes. */
const PATCH_FIELDS = [
  "emplacement",
  "href",
  "libelle",
  "description",
  "action",
  "tonalite",
  "alt",
  "focus",
  "active",
] as const

const banner = toRef(props, "banner")

const { t } = useI18n()
const route = useRoute()

/** Create is edit starting from a `null` banner, exactly `DetailForm.vue:22-23`. */
const mode = computed<"create" | "edit">(() => (banner.value ? "edit" : "create"))

const { create, update, replaceImage, removeMobileImage } = useBanniereMutations()
const isSaving = computed(() =>
  [create, update, replaceImage, removeMobileImage].some(mutation => mutation.isPending.value),
)

const values = reactive({
  emplacement: "principal" as EmplacementBanniere,
  libelle: "",
  description: "",
  action: "Découvrir",
  tonalite: "light" as TonaliteBanniere,
  alt: "",
  href: "",
  focus: 50,
  active: true,
})

const largeFile = ref<File | null>(null)
const mobileFile = ref<File | null>(null)
const largeDimensions = ref<Dimensions | null>(null)
const mobileDimensions = ref<Dimensions | null>(null)
/** The saved mobile artwork is to be removed on Save — staged like a replacement, never immediate. */
const removeMobile = ref(false)

const initialSnapshot = ref("")
const errorKeys = reactive<Record<FieldName, string>>({
  libelle: "",
  description: "",
  action: "",
  alt: "",
  href: "",
})
const submitError = ref("")

function createFormSnapshot() {
  return JSON.stringify(values)
}

function clearFieldErrors() {
  for (const field of FIELD_NAMES) errorKeys[field] = ""
}

function applyFieldErrors(keys: Record<string, string>) {
  for (const field of FIELD_NAMES) errorKeys[field] = keys[field] ?? ""
}

const BLANK_FIELD_VALUES = {
  emplacement: "principal" as EmplacementBanniere,
  libelle: "",
  description: "",
  action: "Découvrir",
  tonalite: "light" as TonaliteBanniere,
  alt: "",
  href: "",
  focus: 50,
  active: true,
}

function deriveFieldValues(current: BanniereAdmin | null) {
  if (!current) return { ...BLANK_FIELD_VALUES }

  const { libelle, description, action, tonalite, alt, href, focus, active } = current
  return {
    emplacement: bannerEmplacement(current),
    libelle,
    description: description ?? "",
    action: action ?? "Découvrir",
    tonalite: tonalite ?? "light",
    alt,
    href,
    focus,
    active,
  }
}

/** Populates from `banner`, or clears when it's `null` — the same function drives the
 *  initial mount (create vs. edit) and Cancel's "reset to what was loaded" behavior. */
function applyBanner(current: BanniereAdmin | null) {
  Object.assign(values, deriveFieldValues(current))
  largeFile.value = null
  mobileFile.value = null
  largeDimensions.value = null
  mobileDimensions.value = null
  removeMobile.value = false
  clearFieldErrors()
  submitError.value = ""
  initialSnapshot.value = createFormSnapshot()
}

applyBanner(banner.value)
watch(banner, applyBanner)

/** What each artwork shows: the staged file first, else the saved one (none for a phone artwork staged for removal). */
const largeObjectUrl = useObjectUrl(largeFile)
const mobileObjectUrl = useObjectUrl(mobileFile)
const largePreviewUrl = computed(() => largeObjectUrl.value ?? banner.value?.url_large ?? null)

function savedMobilePreviewUrl(): string | null {
  if (removeMobile.value) return null
  return banner.value?.url_mobile ?? null
}

const mobilePreviewUrl = computed(() => mobileObjectUrl.value ?? savedMobilePreviewUrl())

const isDirty = computed(() => createFormSnapshot() !== initialSnapshot.value)
const hasStagedArtwork = computed(() => largeFile.value !== null || mobileFile.value !== null || removeMobile.value)
const isMoving = computed(() => banner.value !== null && values.emplacement !== bannerEmplacement(banner.value))

/** Falls back to the existing banner's own stored dimensions for whichever side wasn't
 *  restaged, so a lone staged mobile file is still validated against the real large
 *  artwork rather than against nothing — and a mobile artwork staged for removal, or one the
 *  banner never had, is validated as absent. */
const effectiveLargeDimensions = computed(
  () =>
    largeDimensions.value ??
    (banner.value ? { width: banner.value.largeur_large, height: banner.value.hauteur_large } : null),
)
const effectiveMobileDimensions = computed(
  () => mobileDimensions.value ?? (banner.value && !removeMobile.value ? storedMobileDimensions(banner.value) : null),
)
const artworkIssues = computed(() =>
  validateBannerArtwork(values.emplacement, effectiveLargeDimensions.value, effectiveMobileDimensions.value),
)
const largeIssue = computed(() =>
  artworkIssues.value.includes("largeNotLandscape") ? ("largeNotLandscape" as const) : undefined,
)
const mobileIssue = computed(() =>
  artworkIssues.value.includes("mobileNotNarrower") ? ("mobileNotNarrower" as const) : undefined,
)
/** Only the large artwork is required: without a mobile one, the storefront crops the large. */
const canSubmitCreate = computed(() => Boolean(largeFile.value) && artworkIssues.value.length === 0)

function hasSaveBlocker(): boolean {
  return isSaving.value || artworkIssues.value.length > 0
}

function hasNoEditChanges(): boolean {
  return !isDirty.value && !hasStagedArtwork.value
}

const saveDisabled = computed(() => {
  if (hasSaveBlocker()) return true
  if (mode.value === "create") return !largeFile.value
  return hasNoEditChanges()
})

function buildPayload() {
  return {
    emplacement: values.emplacement,
    href: values.href,
    libelle: values.libelle,
    description: values.description,
    action: values.action,
    tonalite: values.tonalite,
    alt: values.alt,
    focus: values.focus,
    active: values.active,
  }
}

/** Only the fields that actually changed — an empty `PATCH` body is a 400
 *  (« Aucun champ à modifier. », `vitrine.service.ts:418`), so Save must never send one. */
function buildPatch(validated: BanniereFormValues, original: BanniereAdmin): ModifierBanniereInput {
  const saved = {
    ...original,
    emplacement: bannerEmplacement(original),
    description: original.description ?? "",
    action: original.action ?? "Découvrir",
    tonalite: original.tonalite ?? "light",
  }
  return Object.fromEntries(
    PATCH_FIELDS.filter(field => validated[field] !== saved[field]).map(field => [field, validated[field]]),
  ) as ModifierBanniereInput
}

function onCancel() {
  applyBanner(banner.value)
  emit("cancel")
}

function onLargeFileChange(next: File | null) {
  largeFile.value = next
}
function onMobileFileChange(next: File | null) {
  mobileFile.value = next
  // A new file replaces the saved one: there is nothing left to remove.
  if (next) removeMobile.value = false
}
function onLargeDimensions(next: Dimensions | null) {
  largeDimensions.value = next
}
function onMobileDimensions(next: Dimensions | null) {
  mobileDimensions.value = next
}

/** Drops the staged file, and stages the removal of the saved artwork when there is one. */
function onMobileRemove() {
  mobileFile.value = null
  mobileDimensions.value = null
  removeMobile.value = Boolean(banner.value?.url_mobile)
}

function onSubmitCreate() {
  if (!canSubmitCreate.value) return

  const result = banniereSchema.safeParse(buildPayload())
  if (!result.success) {
    applyFieldErrors(toFieldErrorKeys(result.error))
    return
  }
  clearFieldErrors()
  submitError.value = ""

  // canSubmitCreate.value guarantees the large file is staged.
  create.mutate(
    { large: largeFile.value!, mobile: mobileFile.value, fields: result.data },
    {
      onSuccess: created => {
        toast.success(t("content.banners.form.createSuccess"))
        emit("saved", created)
        void navigateTo({ path: route.path, query: { banner: String(created.id) } })
      },
      onError: (error: unknown) => {
        submitError.value = apiErrorText(error, t)
      },
    },
  )
}

/** The staged artwork changes: a removal first, so a replaced large artwork is never checked
 *  against the mobile one on its way out, then the large, then the mobile. */
async function persistArtwork(current: BanniereAdmin): Promise<BanniereAdmin> {
  const afterRemoval = await removeSavedMobile(current)
  const afterLargeReplacement = await replaceStagedArtwork(afterRemoval, "large", largeFile.value)
  return replaceStagedArtwork(afterLargeReplacement, "mobile", mobileFile.value)
}

async function removeSavedMobile(current: BanniereAdmin): Promise<BanniereAdmin> {
  if (!removeMobile.value || mobileFile.value) return current
  return removeMobileImage.mutateAsync(current.id)
}

async function replaceStagedArtwork(
  current: BanniereAdmin,
  variante: "large" | "mobile",
  file: File | null,
): Promise<BanniereAdmin> {
  if (!file) return current
  return replaceImage.mutateAsync({ id: current.id, variante, fichier: file })
}

/**
 * The `PATCH` (only when a field changed) and the artwork routes — a staged artwork never
 * uploads on selection, only on Save. The `PATCH` goes first, except when it moves the banner
 * into the main carousel: the backend checks that move against the large artwork in place at
 * that moment, so a new landscape artwork replacing a portrait one must already be there.
 * Moving out to promo is the reverse, and a portrait replacement is only accepted there.
 */
async function persistEditedBanner(current: BanniereAdmin, patch: ModifierBanniereInput): Promise<BanniereAdmin> {
  const applyPatch = async (latest: BanniereAdmin) =>
    Object.keys(patch).length > 0 ? update.mutateAsync({ id: latest.id, patch }) : latest
  if (patch.emplacement === "principal") return applyPatch(await persistArtwork(current))
  return persistArtwork(await applyPatch(current))
}

function canSubmitEdit(current: BanniereAdmin | null): current is BanniereAdmin {
  if (!current || artworkIssues.value.length > 0) return false
  return isDirty.value || hasStagedArtwork.value
}

async function onSubmitEdit() {
  const current = banner.value
  if (!canSubmitEdit(current)) return

  const result = banniereSchema.safeParse(buildPayload())
  if (!result.success) {
    applyFieldErrors(toFieldErrorKeys(result.error))
    return
  }
  clearFieldErrors()
  submitError.value = ""

  try {
    const latest = await persistEditedBanner(current, buildPatch(result.data, current))
    toast.success(t("content.banners.form.editSuccess"))
    emit("saved", latest)
  } catch (error) {
    submitError.value = apiErrorText(error, t)
  }
}

function onSubmit() {
  if (mode.value === "create") onSubmitCreate()
  else void onSubmitEdit()
}

const libelleId = useId()
const descriptionId = useId()
const actionId = useId()
const tonaliteId = useId()
const altId = useId()

/** Read-write so the footer's toggle (outside this `<form>`, like Save/Cancel) can flip
 *  it directly — same reasoning as `saveDisabled`/`isSaving`/`submitError` below, except
 *  this one also needs a setter since it's a value the footer edits, not just reads. */
const activeValue = computed({
  get: () => values.active,
  set: (value: boolean) => {
    values.active = value
  },
})

/** The Save/Cancel buttons live in `BannerPanel.vue`'s `SheetFooter`, outside this
 *  `<form>` — associated to it via the `form` attribute (`formId`), which is why
 *  submitting is `@submit`/`@reset` on the form itself rather than a click handler.
 *  `saveDisabled`/`isSaving`/`submitError`/`active` are exposed so the footer can
 *  reflect and edit this form's state without owning any of its logic itself. */
defineExpose({ saveDisabled, isSaving, submitError, active: activeValue })
</script>

<template>
  <form
    :id="formId"
    data-testid="banner-form"
    class="flex flex-col gap-5"
    novalidate
    @submit.prevent="onSubmit"
    @reset.prevent="onCancel"
  >
    <ContentBannerArtworkField
      :preview-url="largePreviewUrl"
      :file="largeFile"
      :dimensions="effectiveLargeDimensions"
      :issue="largeIssue"
      :focus="values.focus"
      :emplacement="values.emplacement"
      @update:file="onLargeFileChange"
      @update:dimensions="onLargeDimensions"
    >
      <template #overlay>
        <ContentBannerFocusPicker v-model="values.focus" />
      </template>
    </ContentBannerArtworkField>

    <div class="space-y-1.5">
      <Label :for="libelleId" class="sr-only">{{ t("content.banners.form.libelleLabel") }}</Label>
      <Input
        :id="libelleId"
        v-model="values.libelle"
        data-testid="banner-form-libelle"
        :placeholder="t('content.banners.form.libellePlaceholder')"
        :aria-invalid="!!errorKeys.libelle"
        class="h-auto rounded-xl border-transparent px-3 py-2 text-xl font-bold shadow-none md:text-xl"
      />
      <p v-if="errorKeys.libelle" data-testid="banner-form-libelle-error" class="text-sm text-destructive">
        {{ t(errorKeys.libelle) }}
      </p>
    </div>

    <ContentBannerFormField
      data-testid="banner-form-field-description"
      icon="ph:text-align-left-duotone"
      :label="t('content.banners.form.descriptionLabel')"
      :label-for="descriptionId"
    >
      <Textarea
        :id="descriptionId"
        v-model="values.description"
        data-testid="banner-form-description"
        :placeholder="t('content.banners.form.descriptionPlaceholder')"
        :aria-invalid="!!errorKeys.description"
      />
      <p v-if="errorKeys.description" class="mt-1 text-sm text-destructive">{{ t(errorKeys.description) }}</p>
    </ContentBannerFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <ContentBannerFormField
        icon="ph:cursor-click-duotone"
        :label="t('content.banners.form.actionLabel')"
        :label-for="actionId"
      >
        <Input
          :id="actionId"
          v-model="values.action"
          data-testid="banner-form-action"
          :placeholder="t('content.banners.form.actionPlaceholder')"
          :aria-invalid="!!errorKeys.action"
        />
        <p v-if="errorKeys.action" class="mt-1 text-sm text-destructive">{{ t(errorKeys.action) }}</p>
      </ContentBannerFormField>
      <ContentBannerFormField
        icon="ph:palette-duotone"
        :label="t('content.banners.form.tonaliteLabel')"
        :label-for="tonaliteId"
      >
        <select
          :id="tonaliteId"
          v-model="values.tonalite"
          data-testid="banner-form-tonalite"
          class="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="navy">{{ t("content.banners.form.tonalite.navy") }}</option>
          <option value="light">{{ t("content.banners.form.tonalite.light") }}</option>
          <option value="orange">{{ t("content.banners.form.tonalite.orange") }}</option>
        </select>
      </ContentBannerFormField>
    </div>

    <ContentBannerFormField
      data-testid="banner-form-field-emplacement"
      icon="ph:gradient-duotone"
      :label="t('content.banners.form.emplacementLabel')"
    >
      <ContentBannerEmplacementField v-model="values.emplacement" :moving="isMoving" :disabled="isSaving" />
    </ContentBannerFormField>

    <ContentBannerPhoneArtworkRow
      :preview-url="mobilePreviewUrl"
      :crop-url="largePreviewUrl"
      :focus="values.focus"
      :dimensions="effectiveMobileDimensions"
      :file="mobileFile"
      :issue="mobileIssue"
      :pending-removal="removeMobile"
      @update:file="onMobileFileChange"
      @update:dimensions="onMobileDimensions"
      @remove="onMobileRemove"
      @undo-remove="removeMobile = false"
    />

    <ContentBannerFormField
      data-testid="banner-form-field-href"
      icon="ph:link-duotone"
      :label="t('content.banners.form.href.label')"
    >
      <ContentBannerHrefPicker v-model="values.href" :error="errorKeys.href ? t(errorKeys.href) : ''" />
    </ContentBannerFormField>

    <ContentBannerFormField
      data-testid="banner-form-field-alt"
      icon="ph:text-aa-duotone"
      :label="t('content.banners.form.altLabel')"
      :label-for="altId"
    >
      <template #trailing>
        <span
          data-testid="banner-form-alt-counter"
          class="text-xs tabular-nums"
          :class="
            values.alt.length > 0 && values.alt.length < BANNIERE_ALT_MIN_LENGTH
              ? 'text-destructive'
              : 'text-muted-foreground'
          "
        >
          {{ t("content.banners.form.altCounter", { count: values.alt.length, max: BANNIERE_ALT_MAX_LENGTH }) }}
        </span>
      </template>
      <div class="space-y-1.5">
        <Textarea
          :id="altId"
          v-model="values.alt"
          data-testid="banner-form-alt"
          class="border-0 bg-muted dark:bg-muted"
          :placeholder="t('content.banners.form.altPlaceholder')"
          :aria-invalid="!!errorKeys.alt"
        />
        <p v-if="errorKeys.alt" data-testid="banner-form-alt-error" class="text-sm text-destructive">
          {{ t(errorKeys.alt) }}
        </p>
      </div>
    </ContentBannerFormField>
  </form>
</template>
