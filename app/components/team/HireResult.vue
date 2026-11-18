<script setup lang="ts">
import type { HireTeamMemberResult } from "@/types/api/equipe"
import { computed } from "vue"

const { result } = defineProps<{
  result: HireTeamMemberResult
}>()

const { t } = useI18n()
const passwordDefined = computed(() => result.motDePasseDefini === true)
const deliveryState = computed(() => {
  if (passwordDefined.value) return "password-defined"
  if (result.motDePasseDefini !== undefined) return "password-failed"
  if (result.invitationEnvoyee) return "invitation-sent"
  return "invitation-failed"
})
const isPositive = computed(
  () => deliveryState.value === "password-defined" || deliveryState.value === "invitation-sent",
)
const iconName = computed(() => {
  if (deliveryState.value === "password-defined") return "ph:key"
  if (deliveryState.value === "invitation-sent") return "ph:paper-plane-tilt"
  return "ph:warning-circle"
})
const title = computed(() =>
  t(
    `team.hire.result.${
      {
        "password-defined": "passwordTitle",
        "password-failed": "passwordFailedTitle",
        "invitation-sent": "sentTitle",
        "invitation-failed": "notSentTitle",
      }[deliveryState.value]
    }`,
  ),
)
const body = computed(() =>
  t(
    `team.hire.result.${
      {
        "password-defined": "passwordBody",
        "password-failed": "passwordFailedBody",
        "invitation-sent": "sentBody",
        "invitation-failed": "notSentBody",
      }[deliveryState.value]
    }`,
    { email: result.courriel },
  ),
)
</script>

<template>
  <section class="space-y-3" data-testid="team-hire-result">
    <div
      class="flex items-start gap-3 rounded-2xl p-4"
      :class="isPositive ? 'bg-primary/10' : 'bg-warning/15'"
      :data-invitation-sent="result.invitationEnvoyee ? 'true' : 'false'"
      :data-password-defined="passwordDefined ? 'true' : 'false'"
    >
      <Icon
        :name="iconName"
        size="20"
        class="mt-0.5 shrink-0"
        :class="isPositive ? 'text-primary' : 'text-warning-foreground'"
        aria-hidden="true"
      />
      <div class="min-w-0 space-y-1">
        <p class="text-sm font-semibold text-foreground" data-testid="team-hire-result-title">
          {{ title }}
        </p>
        <p class="text-sm text-muted-foreground" data-testid="team-hire-result-body">
          {{ body }}
        </p>
      </div>
    </div>
  </section>
</template>
