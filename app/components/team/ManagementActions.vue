<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { ref } from "vue"
import { Button } from "@/components/ui/button"

const {
  member,
  isSelf = false,
  pending = false,
} = defineProps<{
  member: TeamMember
  isSelf?: boolean
  pending?: boolean
}>()

const emit = defineEmits<{
  deactivate: []
  reactivate: []
}>()

const { t } = useI18n()
const showDeactivateDialog = ref(false)

function confirmDeactivate() {
  showDeactivateDialog.value = false
  emit("deactivate")
}
</script>

<template>
  <div data-testid="team-management-actions" class="flex flex-wrap items-center justify-end gap-2">
    <TeamDeactivateDialog
      v-if="member.actif && !isSelf"
      :name="member.nom"
      :pending="pending"
      :open="showDeactivateDialog"
      @update:open="showDeactivateDialog = $event"
      @confirm="confirmDeactivate"
    />
    <Button
      v-if="member.actif && !isSelf"
      variant="outline"
      :disabled="pending"
      data-testid="team-deactivate-button"
      @click="showDeactivateDialog = true"
    >
      {{ t("team.actions.deactivate") }}
    </Button>
    <Button
      v-if="!member.actif && !isSelf"
      :disabled="pending"
      data-testid="team-reactivate-button"
      @click="emit('reactivate')"
    >
      {{ t("team.actions.reactivate") }}
    </Button>
  </div>
</template>
