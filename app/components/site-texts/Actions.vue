<script setup lang="ts">
import type { SiteTextStatus } from "@/types/api/site-texts"
import { ref } from "vue"
import { Button } from "@/components/ui/button"

defineProps<{ status: SiteTextStatus; canPublish: boolean; pending: boolean }>()
const emit = defineEmits<{ save: []; submit: []; publish: []; sendBack: [comment: string]; discard: [] }>()

const { t } = useI18n()
const sendingBack = ref(false)
const comment = ref("")

function confirmSendBack() {
  const value = comment.value.trim()
  if (value.length < 3) return
  emit("sendBack", value)
  sendingBack.value = false
  comment.value = ""
}
</script>

<template>
  <div class="grid gap-3 border-t border-border pt-4">
    <div class="flex flex-wrap gap-2">
      <Button variant="outline" :disabled="pending" data-testid="site-text-save" @click="emit('save')">{{
        t("content.siteTexts.save")
      }}</Button>
      <Button
        v-if="status === 'brouillon'"
        variant="outline"
        :disabled="pending"
        data-testid="site-text-submit"
        @click="emit('submit')"
        >{{ t("content.siteTexts.submit") }}</Button
      >
      <Button v-if="canPublish" :disabled="pending" data-testid="site-text-publish" @click="emit('publish')">{{
        t("content.siteTexts.publish")
      }}</Button>
      <Button
        v-if="canPublish && status === 'soumis'"
        variant="outline"
        :disabled="pending"
        data-testid="site-text-send-back"
        @click="sendingBack = true"
        >{{ t("content.siteTexts.sendBack") }}</Button
      >
      <Button variant="ghost" class="ml-auto" :disabled="pending" @click="emit('discard')">{{
        t("content.siteTexts.discard")
      }}</Button>
    </div>
    <form v-if="sendingBack" class="flex flex-wrap items-end gap-2" @submit.prevent="confirmSendBack">
      <textarea
        v-model="comment"
        rows="2"
        class="min-w-0 flex-1 rounded-md border border-input bg-background p-2 text-sm"
        :placeholder="t('content.siteTexts.sendBackPlaceholder')"
        data-testid="site-text-send-back-comment"
      />
      <Button type="submit" size="sm" data-testid="site-text-send-back-confirm">{{
        t("content.siteTexts.sendBackConfirm")
      }}</Button>
    </form>
  </div>
</template>
