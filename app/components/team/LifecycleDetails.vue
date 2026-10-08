<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { formatDateCourte } from "@/utils/dates"

const { member } = defineProps<{
  member: TeamMember
}>()

const { locale, t } = useI18n()

function dateValue(value: string | null | undefined) {
  return value ? formatDateCourte(value, locale.value) : t("team.detail.noValue")
}
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="team-lifecycle-section">
    <div class="flex items-center gap-2">
      <Icon name="ph:clock-countdown" size="18" class="text-primary" aria-hidden="true" />
      <h3 class="font-heading text-lg font-semibold text-foreground">
        {{ t("team.detail.lifecycle") }}
      </h3>
    </div>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.created") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ dateValue(member.creeLe) }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.invited") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ dateValue(member.invitLe) }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.firstLogin") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ dateValue(member.premiereConnexionLe) }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.deactivated") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ dateValue(member.desactiveLe) }}
        </dd>
      </div>
    </dl>
  </section>
</template>
