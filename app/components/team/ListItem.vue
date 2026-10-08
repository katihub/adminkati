<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"

const props = defineProps<{
  member: TeamMember
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { t } = useI18n()
const statusLabel = computed(() => (props.member.actif ? t("team.listItem.active") : t("team.listItem.inactive")))
/** La ligne dit le périmètre, pas une ville : c'est lui qui décide ce que le membre encaisse. */
const perimetreLabel = computed(() => {
  const count = props.member.comptoirs?.length ?? 0
  return count === 0 ? t("team.comptoirs.wholeShop") : t("team.comptoirs.count", { count }, count)
})
</script>

<template>
  <button
    type="button"
    data-testid="team-list-item"
    :data-member-id="member.id"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', member.id)"
  >
    <div
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
      aria-hidden="true"
    >
      {{ member.nom.slice(0, 1).toUpperCase() }}
    </div>
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <span data-testid="team-list-item-name" class="truncate text-sm font-medium text-foreground">{{
          member.nom
        }}</span>
        <Badge
          data-testid="team-list-item-status"
          class="shrink-0 rounded-full border-0! px-2 py-0 text-[10px] font-medium"
          :variant="member.actif ? 'success' : 'outline'"
        >
          {{ statusLabel }}
        </Badge>
      </div>
      <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span class="truncate">{{ member.roles.map(role => t(`team.roles.${role}`)).join(" · ") }}</span>
        <span class="shrink-0" data-testid="team-list-item-comptoirs">{{ perimetreLabel }}</span>
      </div>
    </div>
  </button>
</template>
