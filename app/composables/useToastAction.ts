import { toast } from "vue-sonner"
import { apiErrorText } from "@/utils/api-error"

/**
 * Runs an operator action and reports it: a success toast, or the API error
 * in words. Resolves to whether the action succeeded, so a dialog knows
 * whether to close.
 */
export function useToastAction() {
  const { t } = useI18n()
  return async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      toast.success(success)
      return true
    } catch (cause) {
      toast.error(apiErrorText(cause, t))
      return false
    }
  }
}
