<script setup lang="ts">
import type { SiteTextChange } from "@/types/api/site-texts"

// What the publication is about: minor or important change, a summary, and the translator's confirmation.
defineProps<{ hasEnglish: boolean }>()
const nature = defineModel<SiteTextChange>("nature", { required: true })
const summary = defineModel<string>("summary", { required: true })
const englishConfirmed = defineModel<boolean>("englishConfirmed", { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-3">
    <div class="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
      <label class="grid gap-1 text-sm">
        {{ t("content.siteTexts.natureLabel") }}
        <select
          v-model="nature"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="site-text-nature"
        >
          <option value="mineur">{{ t("content.siteTexts.nature.mineur") }}</option>
          <option value="important">{{ t("content.siteTexts.nature.important") }}</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">
        {{ t("content.siteTexts.summaryLabel") }}
        <input
          v-model="summary"
          maxlength="500"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </label>
    </div>
    <label v-if="hasEnglish" class="flex items-center gap-2 text-sm">
      <input v-model="englishConfirmed" type="checkbox" class="size-4" />
      {{ t("content.siteTexts.englishConfirmed") }}
    </label>
  </div>
</template>
