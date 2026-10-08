<script setup lang="ts">
import type { CommandeDetail, StatutCommande } from "@/types/api/commandes"
import { computed } from "vue"

const { order } = defineProps<{
  order: CommandeDetail
}>()

const { t } = useI18n()

const isTerminalException = computed(() =>
  ["refusee", "annulee", "annulation_demandee", "retour_ouvert"].includes(order.statut),
)

const stages = computed(() => {
  const isRetrait = order.modeRemise === "retrait"
  const step4Key: StatutCommande = isRetrait ? "prete_au_retrait" : "en_remise"
  const step4Icon = isRetrait ? "ph:storefront" : "ph:motorcycle"

  const pipeline: StatutCommande[] = ["soumise", "confirmee", "en_preparation", step4Key, "close"]
  const currentIndex = pipeline.indexOf(order.statut)

  const items = [
    {
      key: "soumise",
      label: t("orders.status.soumise"),
      icon: "ph:receipt",
    },
    {
      key: "confirmee",
      label: t("orders.status.confirmee"),
      icon: "ph:check-circle",
    },
    {
      key: "en_preparation",
      label: t("orders.status.en_preparation"),
      icon: "ph:package",
    },
    {
      key: step4Key,
      label: t(`orders.status.${step4Key}`),
      icon: step4Icon,
    },
    {
      key: "close",
      label: isRetrait ? t("orders.closureMotives.retiree") : t("orders.closureMotives.livree"),
      icon: "ph:check-fat",
    },
  ]

  return items.map((step, idx) => {
    const isDone = currentIndex !== -1 && idx < currentIndex
    const isCurrent = currentIndex !== -1 && idx === currentIndex
    const icon = isDone ? "ph:check-circle-fill" : isCurrent ? step.icon : "ph:circle"
    const style = isDone
      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
      : isCurrent
        ? "rounded-lg bg-primary/10 px-2.5 py-1 font-bold text-foreground"
        : "text-muted-foreground/50 opacity-60"

    return {
      ...step,
      isDone,
      isCurrent,
      icon,
      style,
    }
  })
})
</script>

<template>
  <div
    v-if="!isTerminalException"
    class="hidden sm:flex items-center justify-between pt-2.5 text-xs font-medium overflow-x-auto"
    role="progressbar"
    :aria-valuenow="stages.findIndex(s => s.isCurrent) + 1"
    aria-valuemin="1"
    :aria-valuemax="stages.length"
  >
    <template v-for="(step, idx) in stages" :key="step.key">
      <div class="flex items-center gap-1.5 shrink-0" :class="step.style">
        <Icon
          :name="step.icon"
          size="14"
          aria-hidden="true"
          :class="step.isCurrent ? 'text-primary animate-pulse' : ''"
        />
        <span>{{ step.label }}</span>
      </div>

      <div
        v-if="idx < stages.length - 1"
        class="h-0.5 min-w-4 flex-1 mx-2 rounded-full transition-colors"
        :class="step.isDone ? 'bg-emerald-500/40' : 'bg-muted-foreground/15'"
      />
    </template>
  </div>

  <!-- <div
    v-else
    class="flex items-center gap-2 w-max rounded-xl bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive"
  >
    <Icon name="ph:warning-circle" size="16" aria-hidden="true" class="shrink-0" />
    <span>{{ t(`orders.status.${order.statut}`) }}</span>
  </div> -->
</template>
