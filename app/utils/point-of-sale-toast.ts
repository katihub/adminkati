import type { ExternalToast } from "vue-sonner"
import { toast } from "vue-sonner"

/**
 * The point-of-sale workspace's dark pill, bottom-centre. Per toast rather than on the global
 * Toaster, so the rest of the admin keeps its own toasts. Inline styles, because sonner paints
 * its toasts from CSS variables that a utility class would not outrank.
 */
const PILL: ExternalToast = {
  position: "bottom-center",
  style: { background: "var(--foreground)", color: "var(--background)", border: "none", borderRadius: "9999px" },
  actionButtonStyle: { background: "transparent", color: "var(--primary)", fontWeight: "700" },
}

export interface PointOfSaleToastAction {
  label: string
  onClick: () => void
}

export function pointOfSaleToast(message: string, action?: PointOfSaleToastAction) {
  toast.success(message, { ...PILL, ...(action ? { action } : {}) })
}

export function pointOfSaleErrorToast(message: string, action?: PointOfSaleToastAction) {
  toast.error(message, { ...PILL, ...(action ? { action } : {}) })
}
