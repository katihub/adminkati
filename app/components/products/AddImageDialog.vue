<script setup lang="ts">
import type { ProductImage } from "@/types/api/produits"
import type { ZodError } from "zod/v4"
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
import { useUploadProduitImage } from "@/composables/useProduitMutations"
import { imageSchema } from "@/schemas/produit"
import { apiErrorText } from "@/utils/api-error"
import { PRODUCT_IMAGE_ACCEPTED_TYPES, validateProductImageFile } from "@/utils/product-image-file"

const {
  productId,
  disabled = false,
  triggerDisabled = false,
} = defineProps<{
  /** `null` in add mode, before a product exists to upload against. */
  productId: number | null
  disabled?: boolean
  triggerDisabled?: boolean
}>()

const emit = defineEmits<{
  addUrl: [image: ProductImage]
  uploadSuccess: [images: ProductImage[]]
  /** En création : le fichier est retenu par le formulaire et envoyé une fois le produit créé. */
  stageLocal: [file: File]
}>()

const { t } = useI18n()

const open = ref(false)
const urlInput = ref("")
const altInput = ref("")
const addError = ref("")
const stagedFile = ref<File | null>(null)
const fileName = ref("")
const isDraggingFile = ref(false)

const fileInputId = useId()
const urlInputId = useId()

const uploadMutation = useUploadProduitImage(() => productId ?? 0)
const isUploading = computed(() => uploadMutation.isPending.value)

watch(open, isOpen => {
  if (!isOpen) return
  urlInput.value = ""
  altInput.value = ""
  addError.value = ""
  fileName.value = ""
  stagedFile.value = null
  isDraggingFile.value = false
})

function describeImageError(error: ZodError): string {
  return t(error.issues[0]?.message ?? "validation.invalidUrl")
}

function toProductImage(data: { url: string; alt?: string }): ProductImage {
  return { rang: 0, url: data.url, alt: data.alt ?? null, chemin_local: null, octets: null }
}

function confirmUrlAdd() {
  const result = imageSchema.safeParse({ url: urlInput.value.trim(), alt: altInput.value.trim() || undefined })

  if (!result.success) {
    addError.value = describeImageError(result.error)
    return
  }

  emit("addUrl", toProductImage(result.data))
  open.value = false
}

async function confirmFileUpload() {
  if (!productId || !stagedFile.value) return

  addError.value = ""
  try {
    const updated = await uploadMutation.mutateAsync(stagedFile.value)
    emit("uploadSuccess", updated.images)
    open.value = false
  } catch (error) {
    addError.value = apiErrorText(error, t)
  }
}

function confirmAdd() {
  if (!stagedFile.value) return confirmUrlAdd()
  /* SANS IDENTIFIANT, ON RETIENT AU LIEU DE REFUSER. La route d'images exige
     un produit existant ; en création il n'y en a pas encore. Le fichier
     remonte au formulaire, qui l'enverra dès que la création aura rendu
     l'identifiant — au lieu d'obliger à héberger l'image ailleurs d'abord. */
  if (!productId) {
    emit("stageLocal", stagedFile.value)
    open.value = false
    return
  }
  return confirmFileUpload()
}

function cancelAdd() {
  open.value = false
}

function stageFile(file: File | undefined) {
  if (!file) return

  const errorKey = validateProductImageFile(file)
  if (errorKey) {
    addError.value = t(errorKey)
    stagedFile.value = null
    fileName.value = ""
    return
  }

  addError.value = ""
  stagedFile.value = file
  fileName.value = file.name
}

function onFileSelected(event: Event) {
  stageFile((event.target as HTMLInputElement).files?.[0])
}

function onDropzoneDragOver() {
  if (!disabled) isDraggingFile.value = true
}

function onDropzoneDrop(event: DragEvent) {
  isDraggingFile.value = false
  if (disabled) return
  stageFile(event.dataTransfer?.files?.[0])
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <button
        type="button"
        data-testid="products-image-gallery-add-tile"
        :disabled="disabled || triggerDisabled"
        :aria-label="t('products.imageGallery.add')"
        class="flex size-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="ph:plus" size="20" aria-hidden="true" />
      </button>
    </DialogTrigger>

    <DialogContent data-testid="products-image-gallery-add-dialog" class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t("products.imageGallery.dialogTitle") }}</DialogTitle>
        <DialogDescription>{{ t("products.imageGallery.dialogDescription") }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <Label :for="fileInputId" class="text-sm font-semibold text-foreground">{{
          t("products.imageGallery.uploadLabel")
        }}</Label>
        <label
          :for="fileInputId"
          data-testid="products-image-gallery-dropzone"
          class="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors"
          :class="[
            disabled || isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/40',
            isDraggingFile ? 'border-primary bg-primary/5' : 'border-border',
          ]"
          @dragover.prevent="onDropzoneDragOver"
          @dragleave.prevent="isDraggingFile = false"
          @drop.prevent="onDropzoneDrop"
        >
          <Spinner v-if="isUploading" size="sm" />
          <Icon v-else name="ph:upload-simple" size="26" class="text-muted-foreground" aria-hidden="true" />
          <span class="text-sm font-medium text-foreground">{{ t("products.imageGallery.dropzoneLabel") }}</span>
          <span class="text-xs text-muted-foreground">{{ t("products.imageGallery.dropzoneHint") }}</span>
          <span
            v-if="!productId"
            data-testid="products-image-gallery-file-disabled-hint"
            class="text-xs font-medium text-muted-foreground"
          >
            {{ t("products.imageGallery.fileDisabledHint") }}
          </span>
          <span
            v-if="fileName"
            data-testid="products-image-gallery-file-name"
            class="max-w-full truncate text-xs font-medium text-primary"
          >
            {{ fileName }}
          </span>
        </label>
        <input
          :id="fileInputId"
          type="file"
          :accept="PRODUCT_IMAGE_ACCEPTED_TYPES.join(',')"
          data-testid="products-image-gallery-file-input"
          :disabled="disabled || isUploading"
          class="sr-only"
          @change="onFileSelected"
        />
      </div>

      <div class="flex items-center gap-3" aria-hidden="true">
        <span class="h-px flex-1 bg-border" />
        <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{{
          t("products.imageGallery.or")
        }}</span>
        <span class="h-px flex-1 bg-border" />
      </div>

      <div class="space-y-2">
        <Label :for="urlInputId" class="text-sm font-semibold text-foreground">{{
          t("products.imageGallery.urlLabel")
        }}</Label>
        <Input
          :id="urlInputId"
          v-model="urlInput"
          data-testid="products-image-gallery-url-input"
          :placeholder="t('products.imageGallery.urlPlaceholder')"
          :disabled="disabled"
          class="h-10"
        />
        <Input
          v-model="altInput"
          data-testid="products-image-gallery-alt-input"
          :placeholder="t('products.imageGallery.altPlaceholder')"
          :aria-label="t('products.imageGallery.altPlaceholder')"
          :disabled="disabled"
          class="h-10"
        />
      </div>

      <p v-if="addError" data-testid="products-image-gallery-add-error" role="alert" class="text-sm text-destructive">
        {{ addError }}
      </p>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          data-testid="products-image-gallery-add-cancel"
          :disabled="disabled || isUploading"
          @click="cancelAdd"
        >
          {{ t("products.imageGallery.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="products-image-gallery-add-confirm"
          :disabled="disabled || isUploading"
          @click="confirmAdd"
        >
          <Spinner v-if="isUploading" data-icon="inline-start" size="xs" />
          {{ t("products.imageGallery.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
