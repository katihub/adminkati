<script setup lang="ts">
import type { BannerEditor } from "@/utils/banner-editor"
import { computed } from "vue"
import { findMemberByEmail } from "@/utils/find-member-by-email"

const { editor } = defineProps<{ editor: BannerEditor }>()

const { members, isPending } = useTeamRoster()

const member = computed(() => findMemberByEmail(editor.email, members.value))
</script>

<template>
  <EditorPill
    :editor="editor"
    :member="member"
    :is-pending="isPending"
    pill-test-id="banner-editor-pill"
    card-test-id="banner-editor-card"
  />
</template>
