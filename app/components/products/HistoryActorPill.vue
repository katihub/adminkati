<script setup lang="ts">
import { computed } from "vue"
import { parseEditor } from "@/utils/banner-editor"
import { findMemberByEmail } from "@/utils/find-member-by-email"

const { actor } = defineProps<{ actor: string }>()

const { members, isPending } = useTeamRoster()

const identity = computed(() => parseEditor(actor) ?? { name: actor, email: null })
const member = computed(() => findMemberByEmail(identity.value.email, members.value))
</script>

<template>
  <EditorPill
    :editor="identity"
    :member="member"
    :is-pending="isPending"
    pill-test-id="products-history-panel-actor"
    card-test-id="products-history-panel-actor-card"
  />
</template>
