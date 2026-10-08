import type { Ref } from "vue"
import { computed, nextTick, ref } from "vue"
import { moveId } from "@/utils/point-of-sale"

/**
 * A draft of the storefront order, edited locally and saved once. Moving a row re-inserts its
 * DOM node, which drops focus; it is put back on the same arrow once the new order has rendered,
 * so pressing again keeps moving the same counter. At either end that arrow is disabled, and
 * focus goes to the opposite one instead of falling to the page.
 */
export function useArrangeOrder(container: Ref<HTMLElement | null>) {
  const original = ref<number[]>([])
  const draft = ref<number[] | null>(null)

  const isArranging = computed(() => draft.value !== null)
  const changes = computed(() => draft.value?.filter((id, index) => id !== original.value[index]).length ?? 0)

  function start(ids: readonly number[]) {
    original.value = [...ids]
    draft.value = [...ids]
  }

  function stop() {
    draft.value = null
  }

  async function restoreFocus(id: number, offset: -1 | 1) {
    await nextTick()
    const buttons = [offset, -offset].map(direction =>
      container.value?.querySelector<HTMLButtonElement>(`[data-move='${id}:${direction}']`),
    )
    buttons.find(button => button && !button.disabled)?.focus()
  }

  /** The new position of `id`, 1-based, or `null` when it cannot move that way. */
  function move(id: number, offset: -1 | 1): number | null {
    const next = draft.value && moveId(draft.value, id, offset)
    if (!next) return null
    draft.value = next
    void restoreFocus(id, offset)
    return next.indexOf(id) + 1
  }

  return { draft, isArranging, changes, start, stop, move }
}
