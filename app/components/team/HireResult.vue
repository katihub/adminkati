<script setup lang="ts">
import type { HireTeamMemberResult } from "@/types/api/equipe"

defineProps<{
  result: HireTeamMemberResult
}>()

const { t } = useI18n()
</script>

<template>
  <!--
    L'INVITATION DIT LA VÉRITÉ. Le backend rend `invitationEnvoyee` exprès
    (`equipe.service.ts:110-122`) : le compte peut exister alors que le
    courriel n'est jamais parti. L'écran ne referme donc pas la porte sur un
    « c'est fait » ; il nomme celui des deux cas qui s'est produit.
  -->
  <section class="space-y-3" data-testid="team-hire-result">
    <div
      class="flex items-start gap-3 rounded-2xl p-4"
      :class="result.invitationEnvoyee ? 'bg-primary/10' : 'bg-warning/15'"
      :data-invitation-sent="result.invitationEnvoyee ? 'true' : 'false'"
    >
      <Icon
        :name="result.invitationEnvoyee ? 'ph:paper-plane-tilt' : 'ph:warning-circle'"
        size="20"
        class="mt-0.5 shrink-0"
        :class="result.invitationEnvoyee ? 'text-primary' : 'text-warning-foreground'"
        aria-hidden="true"
      />
      <div class="min-w-0 space-y-1">
        <p class="text-sm font-semibold text-foreground" data-testid="team-hire-result-title">
          {{ result.invitationEnvoyee ? t("team.hire.result.sentTitle") : t("team.hire.result.notSentTitle") }}
        </p>
        <p class="text-sm text-muted-foreground" data-testid="team-hire-result-body">
          {{
            result.invitationEnvoyee
              ? t("team.hire.result.sentBody", { email: result.courriel })
              : t("team.hire.result.notSentBody", { email: result.courriel })
          }}
        </p>
      </div>
    </div>
  </section>
</template>
