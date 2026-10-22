<script setup lang="ts">
import type { PageContent, SiteTextContent } from "@/types/api/site-texts"
import { computed } from "vue"
import { pageChanges } from "@/utils/site-texts"

const props = defineProps<{ draft: SiteTextContent; live: SiteTextContent }>()
const { t } = useI18n()
const changes = computed(() => pageChanges(props.draft as PageContent, props.live as PageContent))
const empty = computed(() => !changes.value.header && !changes.value.sections.length)
</script>

<template>
  <div class="rounded-md border border-border p-3 text-sm" data-testid="site-text-changes">
    <p class="font-semibold">{{ t("content.siteTexts.changesTitle") }}</p>
    <p v-if="empty" class="text-muted-foreground">{{ t("content.siteTexts.noChanges") }}</p>
    <ul v-else class="mt-1 grid gap-0.5">
      <li v-if="changes.header">{{ t("content.siteTexts.headerChanged") }}</li>
      <li v-for="(change, i) in changes.sections" :key="i">
        {{ t(`content.siteTexts.change.${change.change}`, { title: change.title }) }}
      </li>
    </ul>
  </div>
</template>
