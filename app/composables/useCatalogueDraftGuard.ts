import type { Ref } from "vue"
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router"

/** Protect catalogue drafts on selection, query changes and browser navigation. */
export function useCatalogueDraftGuard(dirty: Ref<boolean>, saving: Ref<boolean>) {
  const open = ref(false)
  let pending: (() => void) | null = null
  function request(action: () => void) {
    if (saving.value) return
    if (!dirty.value) {
      action()
      return
    }
    pending = action
    open.value = true
  }
  function confirm() {
    dirty.value = false
    open.value = false
    const action = pending
    pending = null
    action?.()
  }
  function cancel() {
    const dismissed = pending
    open.value = false
    // Reka closes the dialog before forwarding the action's click/confirm event.
    queueMicrotask(() => {
      if (!open.value && pending === dismissed) pending = null
    })
  }
  const guard = (to: { fullPath: string }) => {
    if (saving.value) return false
    if (!dirty.value) return true
    request(() => {
      void navigateTo(to.fullPath)
    })
    return false
  }
  onBeforeRouteLeave(guard)
  onBeforeRouteUpdate(guard)
  if (import.meta.client)
    useEventListener(window, "beforeunload", event => {
      if (!dirty.value) return
      event.preventDefault()
      event.returnValue = ""
    })
  return { open, request, confirm, cancel }
}
