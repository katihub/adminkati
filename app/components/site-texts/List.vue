<script setup lang="ts">
import type { SiteTextType } from "@/types/api/site-texts"
import { computed, ref } from "vue"
import SiteTextsListItem from "@/components/site-texts/ListItem.vue"
import { useSiteTextList } from "@/composables/useSiteTexts"

defineProps<{ selected: string | null }>()
const emit = defineEmits<{ select: [key: string] }>()

const TYPES: SiteTextType[] = ["legal", "editorial", "faq", "courriel"]

const { t } = useI18n()
const type = ref<SiteTextType | "">("")
const texts = useSiteTextList(type)
const empty = computed(() => Boolean(texts.error.value) || !texts.data.value?.length)
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-3">
    <select
      v-model="type"
      class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      :aria-label="t('content.siteTexts.filter')"
    >
      <option value="">{{ t("content.siteTexts.allTypes") }}</option>
      <option v-for="value in TYPES" :key="value" :value="value">{{ t(`content.siteTexts.types.${value}`) }}</option>
    </select>
    <div v-if="texts.isPending.value" class="mt-3 space-y-2">
      <div v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-md bg-muted" />
    </div>
    <InlineStateNotice v-else-if="empty" class="mt-3" icon="ph:article" :text="t('content.siteTexts.empty')" />
    <ul v-else class="mt-3 grid gap-1">
      <li v-for="text in texts.data.value" :key="text.cle">
        <SiteTextsListItem :text="text" :active="selected === text.cle" @select="emit('select', text.cle)" />
      </li>
    </ul>
  </section>
</template>
