<script setup lang="ts">
import type { KatiExpressSuggestion } from "@/composables/useKatiExpress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
/** One ranked courier, with the reasons; a blocked one shows why and offers no button. */
const { suggestion, recommended, pending } = defineProps<{
  suggestion: KatiExpressSuggestion
  recommended: boolean
  pending: boolean
}>()
defineEmits<{ choose: [suggestion: KatiExpressSuggestion] }>()
const { t } = useI18n()
const badge = computed(() =>
  recommended
    ? { variant: "success" as const, label: t("katiExpress.recommended") }
    : suggestion.eligible
      ? null
      : { variant: "destructive" as const, label: t("katiExpress.blocked") },
)
</script>
<template>
  <li
    class="flex flex-col gap-2 rounded-xl border p-3"
    :class="recommended ? 'border-primary bg-primary/5' : 'border-border'"
    :data-testid="`kati-express-suggestion-${suggestion.agentId}`"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-medium">{{ suggestion.nom }}</span>
      <Badge v-if="badge" :variant="badge.variant">{{ badge.label }}</Badge>
    </div>
    <ul class="list-disc pl-5 text-xs text-muted-foreground">
      <li v-for="raison in suggestion.raisons" :key="raison">{{ raison }}</li>
      <li v-if="suggestion.blocage" class="text-destructive">{{ suggestion.blocage }}</li>
    </ul>
    <Button
      v-if="suggestion.eligible"
      size="sm"
      class="self-start"
      :variant="recommended ? 'default' : 'outline'"
      :disabled="pending"
      :data-testid="`kati-express-assign-${suggestion.agentId}`"
      @click="$emit('choose', suggestion)"
      >{{ t("katiExpress.assignTo", { name: suggestion.nom }) }}</Button
    >
  </li>
</template>
