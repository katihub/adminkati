<script setup lang="ts">
import type { AiGenerationHistoryEntry } from "@/types/ai/product-copy"
import { computed, ref, useId } from "vue"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAiGenerationStore } from "@/stores/ai-generation"
import { PRODUCT_COPY_FIELDS } from "@/types/ai/product-copy"

const props = defineProps<{ entry: AiGenerationHistoryEntry; newest: boolean }>()

const { t, locale } = useI18n()
const store = useAiGenerationStore()
const bodyId = useId()

// The newest entry opens by itself and folds again once a newer one arrives, unless the operator chose.
const chosen = ref<boolean | null>(null)
const expanded = computed(() => chosen.value ?? props.newest)

const title = computed(() => props.entry.label || t("products.aiCopy.popup.history.untitled"))
const time = computed(() =>
  new Intl.DateTimeFormat(locale.value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    props.entry.createdAt,
  ),
)
const ask = computed(() =>
  t("products.aiCopy.popup.history.ask", {
    language: t(`products.aiCopy.language.${props.entry.language}`),
    product: title.value,
  }),
)
const generatedFields = computed(() => {
  const entry = props.entry
  if (entry.status !== "ready") return ""
  return PRODUCT_COPY_FIELDS.filter(field => entry.suggestion[field] !== undefined)
    .map(field => t(`products.aiCopy.popup.history.fields.${field}`))
    .join(", ")
})
const isoTime = computed(() => new Date(props.entry.createdAt).toISOString())
</script>

<template>
  <li
    data-testid="ai-generation-history-item"
    :data-status="entry.status"
    :data-reason="entry.status === 'error' ? entry.failure.reason : undefined"
    class="relative pb-6 pl-9 last:pb-0 before:absolute before:top-7 before:-bottom-1 before:left-[0.6875rem] before:w-px before:bg-border last:before:hidden"
  >
    <span
      aria-hidden="true"
      :class="
        cn(
          'absolute top-0.5 left-0 grid size-6 place-items-center rounded-full border',
          entry.status === 'ready'
            ? 'border-success/40 bg-success/10 text-success'
            : 'border-destructive/40 bg-destructive/10 text-destructive',
        )
      "
    >
      <Icon :name="entry.status === 'ready' ? 'ph:check' : 'ph:warning'" size="13" />
    </span>

    <div class="flex items-center gap-1">
      <button
        type="button"
        data-testid="ai-generation-history-toggle"
        :aria-expanded="expanded"
        :aria-controls="bodyId"
        class="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        @click="chosen = !expanded"
      >
        <span class="min-w-0 flex-1 truncate">
          <time :datetime="isoTime" class="font-mono">{{ time }}</time>
          · {{ t(`products.aiCopy.language.${entry.language}`) }} ·
          <span :class="entry.status === 'ready' ? 'text-success' : 'text-destructive'">
            {{ t(`products.aiCopy.popup.history.status.${entry.status}`) }}
          </span>
        </span>
        <Icon
          name="ph:caret-down"
          size="16"
          aria-hidden="true"
          :class="cn('shrink-0 transition-transform', expanded && 'rotate-180')"
        />
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-testid="ai-generation-history-remove"
        :aria-label="t('products.aiCopy.popup.history.remove', { label: title })"
        @click="store.removeEntry(entry.id)"
      >
        <Icon name="ph:trash" size="16" aria-hidden="true" />
      </Button>
    </div>

    <p
      data-testid="ai-generation-history-ask"
      class="mt-2 mb-3 inline-flex max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-xs"
    >
      {{ ask }}
    </p>
    <p
      v-if="entry.status === 'ready'"
      data-testid="ai-generation-history-scope"
      class="mt-2 text-xs text-muted-foreground"
    >
      {{ t("products.aiCopy.popup.history.scope", { fields: generatedFields }) }}
    </p>

    <p
      v-if="!expanded && entry.status === 'ready' && entry.suggestion.name !== undefined"
      data-testid="ai-generation-history-peek"
      class="truncate text-sm text-muted-foreground"
    >
      {{ entry.suggestion.name }}
    </p>
    <div v-if="expanded" :id="bodyId" class="mt-1">
      <AdminAiGenerationEntryBody :entry="entry" :newest="newest" />
    </div>
  </li>
</template>
