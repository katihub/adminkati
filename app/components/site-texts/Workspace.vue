<script setup lang="ts">
import { ref } from "vue"
import SiteTextsDetail from "@/components/site-texts/Detail.vue"
import SiteTextsList from "@/components/site-texts/List.vue"
import SiteTextsSettings from "@/components/site-texts/Settings.vue"
import { useSiteTextRights } from "@/composables/useSiteTexts"

/* EDITABLE SITE TEXTS. The team writes and submits; the direction publishes or
   sends back with a comment. Nothing is overwritten: each publication is a new
   numbered version, and the storefront shows the one in force. */
const { t } = useI18n()
const rights = useSiteTextRights()
const selected = ref<string | null>(null)
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10"
    data-testid="site-texts-workspace"
  >
    <div v-if="rights.isPending.value" class="h-24 animate-pulse rounded-lg bg-muted" />
    <ApiErrorCard v-else-if="rights.error.value" :error="rights.error.value" @retry="rights.refetch()" />
    <div v-else-if="!rights.data.value?.rediger" data-testid="site-texts-forbidden">
      <EmptyStateCard
        icon="ph:lock-simple"
        :text="t('content.siteTexts.forbiddenTitle')"
        :hint="t('content.siteTexts.forbidden')"
      />
    </div>
    <template v-else>
      <SiteTextsSettings v-if="rights.data.value.reglages" />
      <div class="mt-4 grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <SiteTextsList :selected="selected" @select="selected = $event" />
        <SiteTextsDetail v-if="selected" :key="selected" :text-key="selected" :rights="rights.data.value" />
        <p v-else class="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          {{ t("content.siteTexts.pick") }}
        </p>
      </div>
    </template>
  </div>
</template>
