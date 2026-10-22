<script setup lang="ts">
import type { SiteTextRights } from "@/types/api/site-texts"
import { computed } from "vue"
import SiteTextsDraft from "@/components/site-texts/Draft.vue"
import SiteTextsHistory from "@/components/site-texts/History.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSiteTextDetail, useSiteTextMutations } from "@/composables/useSiteTexts"
import { useToastAction } from "@/composables/useToastAction"

const props = defineProps<{ textKey: string; rights: SiteTextRights }>()

const { t, locale } = useI18n()
const detail = useSiteTextDetail(() => props.textKey)
const { openDraft } = useSiteTextMutations()
const run = useToastAction()
const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(iso)) : ""

const live = computed(() => detail.data.value?.publiee ?? null)
const draft = computed(() => detail.data.value?.enCours ?? null)

function open(fromVersionId?: string) {
  void run(() => openDraft.mutateAsync({ key: props.textKey, fromVersionId }), t("content.siteTexts.draftOpened"))
}
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-5">
    <div v-if="detail.isPending.value" class="h-40 animate-pulse rounded-lg bg-muted" />
    <ApiErrorCard v-else-if="detail.error.value" :error="detail.error.value" @retry="detail.refetch()" />
    <template v-else-if="detail.data.value">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="font-mono text-xs text-muted-foreground">{{ detail.data.value.cle }}</p>
          <p class="mt-1 text-sm" data-testid="site-text-live">
            {{
              live
                ? t("content.siteTexts.live", { number: live.numero, date: formatDate(live.publieLe) })
                : t("content.siteTexts.notLive")
            }}
          </p>
        </div>
        <Badge v-if="draft" data-testid="site-text-status">{{ t(`content.siteTexts.status.${draft.statut}`) }}</Badge>
        <Button
          v-else
          size="sm"
          :disabled="openDraft.isPending.value"
          data-testid="site-text-open-draft"
          @click="open()"
          >{{ t("content.siteTexts.edit") }}</Button
        >
      </div>
      <SiteTextsDraft
        v-if="draft"
        :key="draft.id"
        class="mt-5"
        :detail="detail.data.value"
        :draft="draft"
        :rights="rights"
      />
      <SiteTextsHistory
        class="mt-6"
        :entries="detail.data.value.historique"
        :can-restart="!draft"
        @restart="open($event)"
      />
    </template>
  </section>
</template>
