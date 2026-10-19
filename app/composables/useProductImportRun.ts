import type { ProductImportResponse } from "@/types/api/product-import"
import { useQueryClient } from "@tanstack/vue-query"
import { ref } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PATH = "/catalogue/administration/produits/import"

function body(file: File, preview: boolean) {
  const data = new FormData()
  data.append("fichier", file)
  if (preview) data.append("apercu", "true")
  return data
}

export function useProductImportRun() {
  const write = useApiWrite()
  const client = useQueryClient()
  const state = ref<"idle" | "previewing" | "preview" | "importing" | "result" | "failed">("idle")
  const preview = ref<ProductImportResponse | null>(null)
  const result = ref<ProductImportResponse | null>(null)
  const error = ref<unknown>(null)
  let selected: File | null = null

  async function review(file: File) {
    selected = file
    state.value = "previewing"
    error.value = null
    try {
      preview.value = await write<ProductImportResponse>(PATH, { method: "POST", body: body(file, true), retry: 0 })
      state.value = "preview"
    } catch (cause) {
      error.value = cause
      state.value = "failed"
    }
  }

  async function apply() {
    if (!selected || state.value !== "preview" || !preview.value?.pretes) return
    state.value = "importing"
    error.value = null
    try {
      result.value = await write<ProductImportResponse>(PATH, { method: "POST", body: body(selected, false), retry: 0 })
      state.value = "result"
      await client.invalidateQueries({ queryKey: apiQueryKeys.products.all })
    } catch (cause) {
      error.value = cause
      state.value = "failed"
    }
  }

  function reset() {
    state.value = "idle"
    preview.value = null
    result.value = null
    error.value = null
    selected = null
  }

  return { state, preview, result, error, review, apply, reset }
}
