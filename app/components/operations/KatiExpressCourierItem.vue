<script setup lang="ts">
import type { KatiExpressCourier } from "@/composables/useKatiExpress"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
/** One courier and what they carry right now. */
const { courier } = defineProps<{ courier: KatiExpressCourier }>()
const { t, locale } = useI18n({ useScope: "local" })
/* Who the courier is and where they deliver (9 November 2026). */
const residence = computed(() => [courier.quartierResidence, courier.villeResidence].filter(Boolean).join(", "))
const sponsor = computed(() =>
  courier.parrainNom
    ? [courier.parrainNom, courier.parrainLien, courier.parrainTelephone].filter(Boolean).join(" · ")
    : "",
)
const districts = computed(() => courier.quartiersLivraison ?? [])
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
    <span class="text-xs text-muted-foreground"
      >{{ courier.telephone
      }}<template v-if="courier.immatriculation">
        · {{ t("plate", { plate: courier.immatriculation }) }}</template
      ></span
    >
    <span class="text-xs text-muted-foreground">{{ load }}</span>
    <span v-if="ceiling" class="text-xs text-muted-foreground">{{ ceiling }}</span>
    <span v-if="courier.aVerifier" class="text-xs text-warning" data-testid="courier-to-check">{{ t("toCheck") }}</span>
    <span v-if="residence" class="text-xs text-muted-foreground">{{ t("residence", { place: residence }) }}</span>
    <span v-if="sponsor" class="text-xs text-muted-foreground">{{ t("sponsor", { sponsor }) }}</span>
    <details v-if="districts.length" class="text-xs text-muted-foreground">
      <summary class="cursor-pointer">
        {{ t("districts", { city: courier.villeLivraison ?? "", count: districts.length }) }}
      </summary>
      <p class="mt-1">{{ districts.join(", ") }}</p>
    </details>
  </li>
</template>
<i18n lang="json">
{
  "fr": {
    "toCheck": "À vérifier par la direction : pas d’espèces pour l’instant.",
    "residence": "Réside à {place}",
    "plate": "Véhicule {plate}",
    "sponsor": "Parrain : {sponsor}",
    "districts": "Livre à {city} : {count} quartier | Livre à {city} : {count} quartiers"
  },
  "en": {
    "toCheck": "To be checked by the direction: no cash for now.",
    "residence": "Lives in {place}",
    "plate": "Vehicle {plate}",
    "sponsor": "Sponsor: {sponsor}",
    "districts": "Delivers in {city}: {count} neighbourhood | Delivers in {city}: {count} neighbourhoods"
  }
}
</i18n>
