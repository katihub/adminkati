<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, onScopeDispose, ref, watch } from "vue"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAiGenerationStore } from "@/stores/ai-generation"

type Indicator = "loading" | "ready" | "error"

const INDICATOR_CLASS: Record<Indicator, string> = {
  loading: "-inset-1 rounded-full border-2 border-transparent border-t-foreground/60 motion-safe:hidden",
  ready: "top-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white",
  error: "top-0 right-0 size-3 rounded-full bg-destructive ring-2 ring-white",
}

const { t } = useI18n()
const store = useAiGenerationStore()
const { panelOpen, status, unread, failure, label } = storeToRefs(store)
const session = useCachedSession()

const { phase } = useAiIconMorph(() => status.value === "loading")

const NOTICE_MS = 4500

/** A short-lived result for the run that just settled, so the operator need not open the panel to learn it. */
const notice = ref<{ kind: "ready" | "error"; detail: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

function dismissNotice() {
  clearTimeout(noticeTimer)
  notice.value = null
}

watch(status, (next, previous) => {
  if (next === "loading") dismissNotice()
  if (previous !== "loading" || (next !== "ready" && next !== "error") || panelOpen.value) return
  notice.value = {
    kind: next,
    detail:
      next === "error"
        ? t(`products.aiCopy.popup.errors.${failure.value?.reason ?? "unknown"}`)
        : label.value || t("products.aiCopy.popup.history.untitled"),
  }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(dismissNotice, NOTICE_MS)
})
watch(panelOpen, open => {
  if (open) dismissNotice()
})
onScopeDispose(() => clearTimeout(noticeTimer))

function openFromNotice() {
  dismissNotice()
  store.setPanelOpen(true)
}

const canGenerate = computed(() => session.value?.roles.includes("direction") ?? false)
const indicator = computed<Indicator | null>(() => {
  if (status.value === "loading") return "loading"
  if (!unread.value) return null
  return status.value === "error" ? "error" : "ready"
})
</script>

<template>
  <div v-if="canGenerate">
    <Popover :open="panelOpen" @update:open="store.setPanelOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          data-testid="ai-generation-launcher"
          :aria-label="t('products.aiCopy.popup.launcher.open')"
          class="fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-full border border-black/5 bg-white shadow-md outline-none transition-shadow hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <AiIcon class="size-7" :phase="phase" />
          <span
            v-if="indicator"
            data-testid="ai-generation-launcher-indicator"
            :data-kind="indicator"
            aria-hidden="true"
            :class="cn('absolute', INDICATOR_CLASS[indicator])"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        :side-offset="12"
        :collision-padding="16"
        :aria-label="t('products.aiCopy.popup.title')"
        class="w-[min(46rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
      >
        <AdminAiGenerationPanel />
      </PopoverContent>
    </Popover>
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:duration-150"
      enter-from-class="opacity-0 motion-safe:translate-y-2 motion-safe:scale-95"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 motion-safe:translate-y-1"
    >
      <div
        v-if="notice"
        data-testid="ai-generation-notice"
        :data-kind="notice.kind"
        aria-hidden="true"
        class="fixed right-4 bottom-19 z-40 flex w-72 max-w-[calc(100vw-2rem)] cursor-pointer items-start gap-3 rounded-xl bg-popover p-3 text-popover-foreground shadow-lg"
        @click="openFromNotice"
      >
        <span
          :class="
            cn(
              'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
              notice.kind === 'ready' ? 'bg-emerald-600/10 text-emerald-600' : 'bg-destructive/10 text-destructive',
            )
          "
        >
          <Icon :name="notice.kind === 'ready' ? 'ph:check' : 'ph:warning'" size="14" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium">{{ t(`products.aiCopy.popup.launcher.${notice.kind}`) }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{ notice.detail }}</span>
        </span>
      </div>
    </Transition>
    <p role="status" class="sr-only">{{ indicator ? t(`products.aiCopy.popup.launcher.${indicator}`) : "" }}</p>
  </div>
</template>
