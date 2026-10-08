<script setup lang="ts">
import type { ProductCopyFailure } from "@/types/ai/product-copy"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { useAiGenerationStore } from "@/stores/ai-generation"

const props = defineProps<{ failure: ProductCopyFailure; newest: boolean }>()

const { t } = useI18n()
const store = useAiGenerationStore()

const quotaWaitMinutes = computed(() =>
  props.failure.reason === "quota_exceeded" && props.failure.retryAfterSeconds !== null
    ? Math.ceil(props.failure.retryAfterSeconds / 60)
    : null,
)
/** A forbidden refusal cannot change on a second attempt, so the control would only repeat it. */
const showRetry = computed(() => props.newest && store.canRetry && props.failure.reason !== "forbidden")
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm">{{ t(`products.aiCopy.popup.errors.${failure.reason}`) }}</p>
    <p
      v-if="failure.detail"
      data-testid="ai-generation-failure-detail"
      class="text-xs break-words text-muted-foreground"
    >
      {{ failure.detail }}
    </p>
    <p v-if="quotaWaitMinutes !== null" data-testid="ai-generation-quota-wait" class="text-xs text-muted-foreground">
      {{ t("products.aiCopy.popup.quotaWait", { minutes: quotaWaitMinutes }) }}
    </p>
    <div v-if="showRetry" class="flex justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="ai-generation-history-retry"
        @click="store.retryLast()"
      >
        {{ t("products.aiCopy.popup.retry") }}
      </Button>
    </div>
  </div>
</template>
