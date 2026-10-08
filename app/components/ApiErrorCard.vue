<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toApiError } from "@/utils/api-error"

const { error } = defineProps<{
  error: unknown
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()
/** `headlineKey` alone — never `record.message`/any raw backend text. The backend is
 *  read-only and supplies no stable error codes, but a developer-facing exception
 *  string ("[POST] \"/api/v1/...\": 400 Bad Request", or worse, a raw French backend
 *  validation message) is not a fit replacement; every status this can resolve to
 *  already has a real, human sentence in `errors.*`. */
const apiError = computed(() => toApiError(error))
</script>

<template>
  <Empty role="alert" data-testid="api-error-card">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Icon name="ph:warning-circle" size="24" aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{{ t(apiError.headlineKey) }}</EmptyTitle>
    </EmptyHeader>
    <EmptyContent>
      <Button variant="outline" @click="emit('retry')">
        {{ t("stats.retry") }}
      </Button>
    </EmptyContent>
  </Empty>
</template>
