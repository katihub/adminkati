<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const { member } = defineProps<{
  member: TeamMember
}>()

const emit = defineEmits<{ back: [] }>()
const { t } = useI18n()
</script>

<template>
  <header
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
    data-testid="team-detail-header"
  >
    <div class="flex min-w-0 items-center gap-2">
      <Button variant="ghost" size="icon-sm" class="lg:hidden" data-testid="team-detail-back" @click="emit('back')">
        <Icon name="ph:arrow-left" size="16" aria-hidden="true" />
        <span class="sr-only">{{ t("team.page.back") }}</span>
      </Button>
      <div class="min-w-0">
        <h2
          class="truncate font-heading text-lg font-semibold tracking-tight text-foreground"
          data-testid="team-detail-name"
        >
          {{ member.nom }}
        </h2>
        <p class="truncate text-xs text-muted-foreground">
          {{ member.courriel }}
        </p>
      </div>
      <Badge
        data-testid="team-detail-status"
        class="rounded-full border-0! px-2.5 py-0.5 text-xs font-medium"
        :variant="member.actif ? 'success' : 'outline'"
      >
        {{ member.actif ? t("team.detail.active") : t("team.detail.inactive") }}
      </Badge>
    </div>
    <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
