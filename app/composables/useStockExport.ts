import type { ProductListQuery } from "@/types/api/produits"
import type { FormatExportStock } from "@/types/api/stock-export"
import type { ModeImportStock } from "@/types/api/stock-import"
import { ref } from "vue"
import { apiErrorText } from "@/utils/api-error"
import { downloadBlob } from "@/utils/download-file"
import { formatNumber } from "@/utils/format"
import { rehydrateExportError } from "@/utils/order-export"
import { filenameFromDisposition, isExportTooLarge, STOCK_EXPORT_MAX_ROWS, stockExportUrl } from "@/utils/stock-export"

export interface StockExportRequest {
  filters: ProductListQuery
  mode: ModeImportStock
  format: FormatExportStock
}

export function useStockExport() {
  const { t, locale } = useI18n()
  const pending = ref(false)
  const error = ref("")

  function failureText(failure: unknown): string {
    if (isExportTooLarge(failure)) {
      return t("products.stockExport.notices.tooMany", { max: formatNumber(STOCK_EXPORT_MAX_ROWS, locale.value) })
    }
    return apiErrorText(failure, t)
  }

  /** Resolves `true` once the file is saved. A GET has no side effects, so a failure is never retried automatically. */
  async function exporter({ filters, mode, format }: StockExportRequest): Promise<boolean> {
    if (pending.value) return false
    pending.value = true
    error.value = ""
    try {
      const response = await $fetch.raw<Blob>(stockExportUrl(filters, mode, format), { responseType: "blob", retry: 0 })
      const filename = filenameFromDisposition(response.headers.get("content-disposition"), `stock-${mode}.${format}`)
      downloadBlob(response._data as Blob, filename)
      return true
    } catch (failure) {
      error.value = failureText(await rehydrateExportError(failure))
      return false
    } finally {
      pending.value = false
    }
  }

  return { pending, error, exporter }
}
