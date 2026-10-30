<script setup lang="ts">
import type { KatiExpressCourier } from "@/composables/useKatiExpress"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
/** One courier and what they carry right now. */
const { courier } = defineProps<{ courier: KatiExpressCourier }>()
const { t, locale } = useI18n()
const money = (value: number) => formatMontant(value, locale.value).exact
const badge = computed(() =>
  !courier.verifie
    ? { variant: "warning" as const, label: t("katiExpress.unverified") }
    : {
        variant: courier.missionsEnCours ? ("secondary" as const) : ("success" as const),
        label: t("katiExpress.missions", { count: courier.missionsEnCours }),
      },
)
const load = computed(() =>
  [
    t("katiExpress.carrying", { amount: money(courier.aEncaisserFcfa) }),
    courier.especesNonRemisesFcfa ? t("katiExpress.notHandedIn", { amount: money(courier.especesNonRemisesFcfa) }) : "",
  ]
    .filter(Boolean)
    .join(" · "),
)
const ceiling = computed(() =>
  courier.plafondEspecesFcfa === null ? "" : t("katiExpress.ceiling", { amount: money(courier.plafondEspecesFcfa) }),
)
</script>
<template>
  <li class="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm">
    <span class="flex items-center justify-between gap-2">
      <span class="font-medium">{{ courier.nom }}</span>
      <Badge :variant="badge.variant">{{ badge.label }}</Badge>
    </span>
    <span class="text-xs text-muted-foreground">{{ courier.telephone }}</span>
    <span class="text-xs text-muted-foreground">{{ load }}</span>
    <span v-if="ceiling" class="text-xs text-muted-foreground">{{ ceiling }}</span>
  </li>
</template>
