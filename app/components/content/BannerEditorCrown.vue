<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { computed } from "vue"
import { isAdministration } from "@/utils/administration"

const { member } = defineProps<{ member: TeamMember | null }>()

const { t } = useI18n()
const isDirection = computed(() => isAdministration(member?.roles))
</script>

<template>
  <!-- The icon itself is hidden from assistive tech, so the label lives on the wrapper. -->
  <span
    v-if="isDirection"
    data-testid="banner-editor-crown"
    role="img"
    :aria-label="t('team.roles.direction')"
    class="inline-flex text-warning"
  >
    <Icon name="ph:crown-simple-fill" />
  </span>
</template>
