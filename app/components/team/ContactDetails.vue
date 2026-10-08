<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { computed } from "vue"
import { useComptoirs } from "@/composables/usePointsVente"
import { comptoirLabels } from "@/utils/comptoirs"

const { member } = defineProps<{
  member: TeamMember
}>()

const { t } = useI18n()
const { comptoirs } = useComptoirs()

/** Vide = toute la boutique, et c'est écrit plutôt que laissé à deviner. */
const perimetre = computed(() => {
  const cles = member.comptoirs ?? []
  return cles.length === 0 ? t("team.comptoirs.wholeShop") : comptoirLabels(comptoirs.value, cles).join(" · ")
})
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="team-readonly-details">
    <div class="flex items-center gap-2">
      <Icon name="ph:address-book" size="18" class="text-primary" aria-hidden="true" />
      <h3 class="font-heading text-lg font-semibold text-foreground">
        {{ t("team.detail.contact") }}
      </h3>
    </div>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.email") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ member.courriel }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.detail.phone") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ member.telephone || t("team.detail.noValue") }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.comptoirs.label") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground" data-testid="team-readonly-comptoirs">
          {{ perimetre }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("team.form.roles") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ member.roles.map(role => t(`team.roles.${role}`)).join(" · ") }}
        </dd>
      </div>
    </dl>
  </section>
</template>
