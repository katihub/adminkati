<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"
import { computed, ref, toRef, useId, useTemplateRef, watch } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useBanniereMutations } from "@/composables/useBanniereMutations"
import { apiErrorText } from "@/utils/api-error"
import { bannerEmplacement, bannerFrameClass } from "@/utils/banner-artwork"
import { productImageUrl } from "@/utils/product-image-url"

const props = defineProps<{
  open: boolean
  banner: BanniereAdmin | null
  mode: "view" | "create"
  canWrite: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [banner: BanniereAdmin]
  deleted: [id: number]
}>()

const banner = toRef(props, "banner")

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const { update, remove } = useBanniereMutations()

/** `activeView` is the read ↔ edit switch inside the panel; Phase 4 builds the actual
 *  edit form, this phase only builds the plumbing. Resets on a banner change — same
 *  discipline as `DetailForm.vue:126-129` — so a stale edit buffer never survives
 *  selecting a different banner. (Each `BannerArtworkPreview` resets its own
 *  loaded-image flag on its `src` prop, independently.) */
const activeView = ref<"view" | "edit">("view")
const deleteDialogOpen = ref(false)
const publishValue = ref(banner.value?.active ?? false)

watch(banner, next => {
  activeView.value = "view"
  deleteDialogOpen.value = false
  publishValue.value = next?.active ?? false
})

const isNotFound = computed(() => props.mode === "view" && banner.value === null)
const showViewContent = computed(() => props.mode === "view" && activeView.value === "view" && banner.value !== null)
const showEditForm = computed(() => props.mode === "create" || activeView.value === "edit")
const showActionRail = computed(
  () => props.canWrite && props.mode === "view" && activeView.value === "view" && banner.value !== null,
)

/** `url_large` is already absolute — `productImageUrl` is a defensive passthrough,
 *  matching `BannerCard.vue` and `ListItem.vue:24`. View mode shows only the large
 *  artwork, through the same `ContentBannerArtworkPreview` (and the same fixed IPX
 *  modifiers) the grid card uses, so the two share one cached download instead of each
 *  fetching the multi-MB original separately. */
const largeUrl = computed(() =>
  banner.value
    ? (productImageUrl(banner.value.url_large, runtimeConfig.public.catalogueImageOrigin) ?? banner.value.url_large)
    : null,
)
/** The same frame as the banner's card in the list, so the crop shown is the one chosen there. */
const largeAspectClass = computed(() => bannerFrameClass(banner.value ? bannerEmplacement(banner.value) : "principal"))

const title = computed(() =>
  t(props.mode === "create" ? "content.banners.panel.newTitle" : "content.banners.panel.title"),
)

/** `BannerForm`'s Save/Cancel live here in the footer instead of inside its own
 *  scrollable content — `editFormId` is the HTML `form` attribute association (the
 *  buttons are DOM siblings of the `<form>`, not descendants), and `formRef` reads the
 *  form's own validation/pending state back out, since this panel doesn't duplicate
 *  any of that logic. */
interface BannerFormHandle {
  saveDisabled: boolean
  isSaving: boolean
  submitError: string
  active: boolean
}
const editFormId = useId()
const formRef = useTemplateRef<BannerFormHandle>("formRef")

function onOpenChange(open: boolean) {
  if (!open) emit("close")
}

function startEdit() {
  activeView.value = "edit"
}

/** Cancel means "nothing was written" — in create mode that closes the panel and clears
 *  `?new` (via the same `close` emit the not-found state uses); in edit mode it just
 *  drops back to the read-only view, mirroring `products.vue:107-110`. */
function onFormCancel() {
  if (props.mode === "create") emit("close")
  else activeView.value = "view"
}

/** `BannerForm` owns validation, the request(s), and its own toast — this only owns the
 *  state `BannerForm` can't reach: flipping the panel back to view mode, and forwarding
 *  the save upward so a future consumer of the panel can react to it too. */
function onFormSaved(saved: BanniereAdmin) {
  activeView.value = "view"
  emit("saved", saved)
}

/** The one write that skips edit mode entirely — fires on toggle, not on Save. */
function onTogglePublish() {
  if (!banner.value || update.isPending.value) return

  const previous = banner.value.active
  const next = !previous
  publishValue.value = next

  update.mutate(
    { id: banner.value.id, patch: { active: next } },
    {
      onError: () => {
        publishValue.value = previous
        toast.error(t("content.banners.panel.publishError"))
      },
    },
  )
}

function onConfirmDelete() {
  if (!banner.value) return

  remove.mutate(banner.value.id, {
    onSuccess: result => {
      deleteDialogOpen.value = false
      toast.success(t("content.banners.panel.deleteSuccess"))
      emit("deleted", result.id)
      emit("close")
    },
    onError: (error: unknown) => {
      toast.error(apiErrorText(error, t))
    },
  })
}
</script>

<template>
  <Sheet :open="open" @update:open="onOpenChange">
    <SheetContent side="right" data-testid="banner-panel" class="w-full gap-0 p-0 sm:min-w-[60vw] sm:max-w-none">
      <SheetHeader class="border-b border-border">
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription class="sr-only">
          {{ t("content.banners.panel.description") }}
        </SheetDescription>
      </SheetHeader>

      <div
        v-if="isNotFound"
        data-testid="banner-panel-not-found"
        class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p class="text-sm text-muted-foreground">
          {{ t("content.banners.panel.notFound") }}
        </p>
        <Button data-testid="banner-panel-not-found-close" variant="outline" size="sm" @click="emit('close')">
          {{ t("content.banners.panel.close") }}
        </Button>
      </div>

      <ScrollArea v-else class="scroll-area-fill min-h-0 flex-1">
        <div v-if="showViewContent && banner" data-testid="banner-panel-view" class="flex flex-1 flex-col gap-6 p-6">
          <ContentBannerArtworkPreview
            testid="banner-panel-artwork-large"
            :src="largeUrl"
            :alt="banner.alt"
            :aspect-class="largeAspectClass"
            :focus="banner.focus"
          />

          <ContentBannerPanelDetails :banner="banner" />
        </div>

        <div v-else-if="showEditForm" data-testid="banner-panel-edit" class="p-6">
          <ContentBannerForm
            ref="formRef"
            :banner="banner"
            :form-id="editFormId"
            @cancel="onFormCancel"
            @saved="onFormSaved"
          />
        </div>
      </ScrollArea>

      <ContentBannerFormActions
        v-if="showEditForm"
        :form-id="editFormId"
        :save-disabled="formRef?.saveDisabled ?? true"
        :is-saving="formRef?.isSaving ?? false"
        :submit-error="formRef?.submitError ?? ''"
        :active="formRef?.active ?? true"
        @update:active="
          value => {
            if (formRef) formRef.active = value
          }
        "
      />

      <ContentBannerPanelActionRail
        v-if="showActionRail"
        :active="publishValue"
        :publish-pending="update.isPending.value"
        :delete-pending="remove.isPending.value"
        :delete-open="deleteDialogOpen"
        @update:active="onTogglePublish"
        @update:delete-open="value => (deleteDialogOpen = value)"
        @edit="startEdit"
        @confirm-delete="onConfirmDelete"
      />
    </SheetContent>
  </Sheet>
</template>
