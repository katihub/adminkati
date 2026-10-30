<script setup lang="ts">
import type { TeamRole } from "@/types/api/equipe"
import { cn } from "@/lib/utils"
import { TEAM_ROLES } from "@/types/api/equipe"
const { selectedRoles = [] } = defineProps<{ selectedRoles?: readonly TeamRole[] }>()
const { t, tm, rt } = useI18n({ useScope: "local" })
function roleText(role: TeamRole) {
  return tm(role) as { title: string; description: string }
}
</script>
<template>
  <section class="rounded-2xl border border-border bg-card p-4 sm:p-5" data-testid="team-role-guide">
    <h3 class="font-heading text-lg font-semibold">{{ t("title") }}</h3>
    <p class="mt-1 text-sm text-muted-foreground">{{ t("description") }}</p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <article
        v-for="role in TEAM_ROLES"
        :key="role"
        :data-testid="`team-role-guide-${role}`"
        :aria-current="selectedRoles.includes(role) ? 'true' : undefined"
        :class="
          cn('rounded-xl border border-border p-3', selectedRoles.includes(role) && 'border-primary/40 bg-primary/5')
        "
      >
        <h4 class="text-sm font-semibold">{{ rt(roleText(role).title) }}</h4>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ rt(roleText(role).description) }}</p>
      </article>
    </div>
    <p class="mt-4 text-xs text-muted-foreground">{{ t("notice") }}</p>
  </section>
</template>
<i18n lang="json">
{
  "en": {
    "title": "Roles and access",
    "description": "Highlighted roles belong to the selected member. Each role keeps its own scope.",
    "notice": "Only direction can change access. Your own roles cannot be changed here; the backend remains the authority for every action.",
    "direction": {
      "title": "Direction",
      "description": "Administration, financial decisions, content publication, team access and platform settings."
    },
    "comptoir": {
      "title": "Counter",
      "description": "Orders, quotes, customer directory and operational disputes. Content can be read, but publication and access changes remain with direction."
    },
    "preparation": {
      "title": "Preparation",
      "description": "Preparation workflow for orders and team directory. No access to publication, financial decisions or team editing."
    },
    "livreur": {
      "title": "Delivery",
      "description": "Delivery-related order workflow and team directory. No access to publication, financial decisions or team editing."
    },
    "point_focal": {
      "title": "KATI focal point",
      "description": "Only assigned shops: seller files, catalogue moderation, shop agents and operational disputes. No administrative payout rights."
    }
  },
  "fr": {
    "title": "Rôles et accès",
    "description": "Les rôles surlignés sont ceux du membre sélectionné. Chaque rôle conserve son périmètre.",
    "notice": "Seule la direction modifie les accès. Vos propres rôles ne sont pas modifiables ici ; le backend contrôle chaque action.",
    "direction": {
      "title": "Direction",
      "description": "Administration, décisions financières, publication des contenus, accès de l’équipe et paramètres de la plateforme."
    },
    "comptoir": {
      "title": "Comptoir",
      "description": "Commandes, devis, annuaire clients et litiges opérationnels. Les contenus sont consultables, mais publication et accès restent à la direction."
    },
    "preparation": {
      "title": "Préparation",
      "description": "Parcours de préparation des commandes et annuaire de l’équipe. Sans publication, décision financière ni modification de l’équipe."
    },
    "livreur": {
      "title": "Livreur",
      "description": "Parcours des commandes lié à la livraison et annuaire de l’équipe. Sans publication, décision financière ni modification de l’équipe."
    },
    "point_focal": {
      "title": "Point focal KATI",
      "description": "Uniquement les boutiques assignées : dossiers vendeurs, modération du catalogue, agents et litiges opérationnels. Sans droit de reversement administratif."
    }
  }
}
</i18n>
