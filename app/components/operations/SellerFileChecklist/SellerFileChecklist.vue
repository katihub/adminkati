<script setup lang="ts">
import type { SellerFileRequirement, SellerRequirementState } from "@/types/api/marketplace-moderation"
import { computed } from "vue"

/**
 * The required documents of a seller file (12 November 2026), by the same rule as the seller space:
 * at a glance, what is valid, what waits for the team, and what is still missing or refused.
 */
const { requirements } = defineProps<{ requirements: SellerFileRequirement[] }>()
const { t } = useI18n({ useScope: "local" })

const required = computed(() => requirements.filter(requirement => requirement.obligatoire))
const validCount = computed(() => required.value.filter(requirement => requirement.etat === "valide").length)

function stateLabel(state: SellerRequirementState) {
  const labels: Record<SellerRequirementState, string> = {
    valide: t("valid"),
    en_attente: t("toReview"),
    refuse: t("refused"),
    expire: t("expired"),
    manquant: t("missing"),
  }
  return labels[state]
}

const icons: Record<SellerRequirementState, { name: string; class: string }> = {
  valide: { name: "ph:check-circle-fill", class: "text-emerald-600" },
  en_attente: { name: "ph:hourglass-medium", class: "text-amber-600" },
  refuse: { name: "ph:x-circle-fill", class: "text-destructive" },
  expire: { name: "ph:clock-countdown", class: "text-destructive" },
  manquant: { name: "ph:circle-dashed", class: "text-muted-foreground" },
}
</script>

<template>
  <section
    v-if="requirements.length"
    class="rounded-lg border border-border bg-card"
    data-testid="seller-file-checklist"
  >
    <div class="flex items-center justify-between border-b border-border p-4">
      <h3 class="font-heading font-semibold">{{ t("title") }}</h3>
      <span class="text-xs text-muted-foreground" data-testid="seller-file-checklist-count">{{
        t("count", { valid: validCount, total: required.length })
      }}</span>
    </div>
    <ul class="divide-y divide-border">
      <li
        v-for="requirement in requirements"
        :key="requirement.type"
        class="flex items-start gap-3 px-4 py-2.5 text-sm"
        :data-testid="`seller-requirement-${requirement.type}`"
      >
        <Icon :name="icons[requirement.etat].name" class="mt-0.5 shrink-0" :class="icons[requirement.etat].class" />
        <div class="min-w-0 flex-1">
          <p>
            {{ requirement.libelle }}
            <span v-if="!requirement.obligatoire" class="text-xs text-muted-foreground">· {{ t("optional") }}</span>
          </p>
          <p v-if="requirement.motif" class="text-xs text-destructive">{{ requirement.motif }}</p>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground">{{ stateLabel(requirement.etat) }}</span>
      </li>
    </ul>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Required documents",
    "count": "{valid}/{total} required valid",
    "optional": "optional",
    "valid": "Valid",
    "toReview": "To review",
    "refused": "Refused",
    "expired": "Expired",
    "missing": "Missing"
  },
  "fr": {
    "title": "Pièces requises",
    "count": "{valid}/{total} obligatoires valides",
    "optional": "facultative",
    "valid": "Valide",
    "toReview": "À vérifier",
    "refused": "Refusée",
    "expired": "Expirée",
    "missing": "Manquante"
  }
}
</i18n>
