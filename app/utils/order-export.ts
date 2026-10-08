import type { ExportDocument, ExportLocale } from "@/types/api/commandes"
import { downloadBlob } from "./download-file"

export function orderExportUrl(reference: string, documentType: ExportDocument, locale: ExportLocale): string {
  const params = new URLSearchParams({ document: documentType, locale })
  return `/api/v1/commandes/${encodeURIComponent(reference)}/export?${params.toString()}`
}

export function orderExportFilename(reference: string, documentType: ExportDocument, locale: ExportLocale): string {
  return `${reference}-${documentType}-${locale}.pdf`
}

/**
 * With `responseType: "blob"` even a failed export's JSON error body arrives as a Blob;
 *  rehydrate it so `apiErrorText` can read the backend's message.
 */
export async function rehydrateExportError(error: unknown): Promise<unknown> {
  const data = (error as { data?: unknown }).data
  if (!(data instanceof Blob)) return error

  try {
    return { ...(error as object), data: JSON.parse(await data.text()) }
  } catch {
    return error
  }
}

export function downloadOrderExport(blob: Blob, filename: string) {
  downloadBlob(blob, filename)
}
