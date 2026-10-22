<script setup lang="ts">
import type { SiteTextSummary } from "@/types/api/site-texts"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"

const props = defineProps<{ text: SiteTextSummary; active: boolean }>()
const emit = defineEmits<{ select: [] }>()

const { t } = useI18n()
const badges = computed(() => [
  { label: t(`content.siteTexts.types.${props.text.type}`), variant: "outline" as const },
  ...(props.text.publiee
    ? [
        {
          label: t("content.siteTexts.versionShort", { number: props.text.publiee.numero }),
          variant: "outline" as const,
        },
      ]
    : []),
  ...(props.text.enCours
    ? [{ label: t(`content.siteTexts.status.${props.text.enCours.statut}`), variant: "default" as const }]
    : []),
  ...((props.text.enCours ?? props.text.publiee)?.anglais === "a_mettre_a_jour"
    ? [{ label: t("content.siteTexts.englishLate"), variant: "destructive" as const }]
    : []),
])
</script>

<template>
  <button
    type="button"
    class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
    :class="active ? 'bg-muted' : ''"
    :data-testid="`site-text-${text.cle}`"
    @click="emit('select')"
  >
    <span class="block font-medium">{{ text.titre ?? text.cle }}</span>
    <span class="mt-1 flex flex-wrap gap-1">
      <Badge v-for="badge in badges" :key="badge.label" :variant="badge.variant">{{ badge.label }}</Badge>
    </span>
  </button>
</template>
