import type { MaybeRefOrGetter } from "vue"
import { usePreferredReducedMotion, useRafFn } from "@vueuse/core"
import { computed, ref, toValue, watch } from "vue"
import { AI_ICON_KEYFRAMES } from "@/utils/ai-icon-morph"

const MORPH_MS = 900
// A tab coming back from the background reports one huge frame; without a cap the icon would jump.
const MAX_FRAME_MS = 64

/**
 * Loops the NowTech AI icon through its shapes while `active` is true. When `active` ends it finishes the
 * loop in progress, so the icon always comes to rest on its own shape instead of stopping halfway.
 */
export function useAiIconMorph(active: MaybeRefOrGetter<boolean>) {
  const phase = ref(0)
  const motion = usePreferredReducedMotion()
  const running = computed(() => toValue(active) && motion.value !== "reduce")

  const { pause, resume } = useRafFn(
    ({ delta }) => {
      const next = phase.value + Math.min(delta, MAX_FRAME_MS) / MORPH_MS
      if (!running.value && next >= AI_ICON_KEYFRAMES) {
        phase.value = 0
        pause()
        return
      }
      phase.value = next % AI_ICON_KEYFRAMES
    },
    { immediate: false },
  )

  watch(
    running,
    isRunning => {
      if (isRunning) resume()
    },
    { immediate: true },
  )

  return { phase }
}
