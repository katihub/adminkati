import type { Dimensions } from "@/utils/banner-artwork"
import type { Ref } from "vue"
import { ref } from "vue"

/** The backend only reads these three headers (`src/commun/images/dimensions.ts:31-42`) — anything else is rejected here, before a single byte is measured. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface PickerHandlers {
  picked: (file: File, dimensions: Dimensions) => void
  /** The file is an accepted type but could not be measured. */
  unreadable: () => void
}

function measureViaImageElement(target: File): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(target)
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("image-load-failed"))
    }
    image.src = url
  })
}

/**
 * `createImageBitmap` first; the `Image` + object-URL path only covers environments
 *  (older browsers, some test harnesses) where it isn't available.
 */
async function measureDimensions(target: File): Promise<Dimensions> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(target)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return dimensions
  }
  return measureViaImageElement(target)
}

/**
 * Picking or dropping one artwork file and measuring it. Nothing is reported for a file the
 * backend would not read; `formatError` says why instead.
 */
export function useArtworkPicker(input: Readonly<Ref<HTMLInputElement | null>>, handlers: PickerHandlers) {
  const { t } = useI18n()

  const formatError = ref("")
  const isDraggingFile = ref(false)

  async function handleFile(selected: File | null) {
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      formatError.value = t("content.banners.form.artwork.unsupportedFormat")
      return
    }

    try {
      const dimensions = await measureDimensions(selected)
      formatError.value = ""
      handlers.picked(selected, dimensions)
    } catch {
      formatError.value = t("content.banners.form.artwork.measureFailed")
      handlers.unreadable()
    }
  }

  function openPicker() {
    input.value?.click()
  }

  function onInputChange(event: Event) {
    const target = event.target as HTMLInputElement
    void handleFile(target.files?.[0] ?? null)
    target.value = ""
  }

  const dropListeners = {
    dragover: (event: DragEvent) => {
      event.preventDefault()
      isDraggingFile.value = true
    },
    dragleave: (event: DragEvent) => {
      event.preventDefault()
      isDraggingFile.value = false
    },
    drop: (event: DragEvent) => {
      event.preventDefault()
      isDraggingFile.value = false
      void handleFile(event.dataTransfer?.files?.[0] ?? null)
    },
  }

  return { formatError, isDraggingFile, openPicker, onInputChange, dropListeners }
}
