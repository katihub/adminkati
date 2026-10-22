<script setup lang="ts">
import type { SiteTextHistoryEntry } from "@/types/api/site-texts"
import { Button } from "@/components/ui/button"

defineProps<{ entries: SiteTextHistoryEntry[]; canRestart: boolean }>()
const emit = defineEmits<{ restart: [versionId: string] }>()

const { t, locale } = useI18n()
const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : ""
</script>

<template>
  <div>
    <h4 class="text-sm font-semibold">{{ t("content.siteTexts.history") }}</h4>
    <ul class="mt-2 divide-y divide-border rounded-md border border-border">
      <li v-for="entry in entries" :key="entry.id" class="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
        <span class="font-medium">{{ t("content.siteTexts.versionShort", { number: entry.numero }) }}</span>
        <span class="text-muted-foreground">{{ formatDate(entry.publieLe) }}</span>
        <span v-if="entry.publieParNom" class="text-muted-foreground">· {{ entry.publieParNom }}</span>
        <span class="text-xs text-muted-foreground">· {{ t(`content.siteTexts.nature.${entry.nature}`) }}</span>
        <span v-if="entry.resume" class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{
          entry.resume
        }}</span>
        <Button v-if="canRestart" size="sm" variant="ghost" class="ml-auto" @click="emit('restart', entry.id)">{{
          t("content.siteTexts.restartFrom")
        }}</Button>
      </li>
    </ul>
  </div>
</template>
