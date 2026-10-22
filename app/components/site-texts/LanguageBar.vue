<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"

const props = defineProps<{ hasEnglish: boolean }>()
const language = defineModel<"fr" | "en">("language", { required: true })
const preview = defineModel<boolean>("preview", { required: true })
const emit = defineEmits<{ addEnglish: [] }>()

const { t } = useI18n()
const variant = (code: "fr" | "en") => (language.value === code ? "default" : "outline")
const previewLabel = computed(() => t(preview.value ? "content.siteTexts.backToEdit" : "content.siteTexts.preview"))
const showEnglish = computed(() => props.hasEnglish)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Button size="sm" :variant="variant('fr')" @click="language = 'fr'">{{ t("content.siteTexts.french") }}</Button>
    <Button v-if="showEnglish" size="sm" :variant="variant('en')" @click="language = 'en'">{{
      t("content.siteTexts.english")
    }}</Button>
    <Button v-else size="sm" variant="outline" data-testid="site-text-add-english" @click="emit('addEnglish')">{{
      t("content.siteTexts.addEnglish")
    }}</Button>
    <Button size="sm" variant="ghost" class="ml-auto" @click="preview = !preview">{{ previewLabel }}</Button>
  </div>
</template>
