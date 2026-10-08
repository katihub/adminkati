import type { MaybeRefOrGetter } from "vue"
import { ref, toValue, watch } from "vue"

/** A blob URL for a picked file: made when the file arrives, released when it is replaced, cleared, or its owner goes away. */
export function useObjectUrl(file: MaybeRefOrGetter<File | null>) {
  const url = ref<string | null>(null)

  watch(
    () => toValue(file),
    (next, _previous, onCleanup) => {
      if (!next) {
        url.value = null
        return
      }
      const created = URL.createObjectURL(next)
      url.value = created
      onCleanup(() => URL.revokeObjectURL(created))
    },
    { immediate: true },
  )

  return url
}
