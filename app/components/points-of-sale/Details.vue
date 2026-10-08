<script setup lang="ts">
import type { PointVenteAdmin } from "@/types/api/vitrine"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"
import { mapLink } from "@/utils/point-of-sale"
import { whatsappLink } from "@/utils/whatsapp"

const { point } = defineProps<{
  point: PointVenteAdmin
}>()

const { t, locale } = useI18n()

/** Each number as the storefront offers it: a call, and a chat when it answers on WhatsApp. */
const telephones = computed(() =>
  point.telephones.map(telephone => ({
    ...telephone,
    tel: `tel:${telephone.numero.replace(/\s+/g, "")}`,
    whatsappHref: telephone.whatsapp ? whatsappLink(telephone.numero, "") : null,
  })),
)
const status = computed(() =>
  point.active
    ? { variant: "default" as const, text: t("pointsOfSale.status.active") }
    : { variant: "secondary" as const, text: t("pointsOfSale.status.inactive") },
)

const horaires = computed(() =>
  point.horaires
    ? { text: point.horaires, className: "text-foreground" }
    : { text: t("pointsOfSale.panel.notProvided"), className: "text-muted-foreground" },
)

/**
 * The two ways to find the counter on a map: the link the storefront and the assistant publish,
 * and the GPS pin. Same shape, so one block renders both.
 */
const mapLinks = computed(() => [
  {
    key: "carte",
    label: t("pointsOfSale.panel.carte"),
    testid: "points-of-sale-panel-carte",
    href: point.carte,
    icon: "ph:map-trifold",
    text: t("pointsOfSale.panel.carteOpen"),
  },
  {
    key: "coordinates",
    label: t("pointsOfSale.panel.coordinates"),
    testid: "points-of-sale-panel-map",
    href: point.latitude !== null && point.longitude !== null ? mapLink(point.latitude, point.longitude) : null,
    icon: "ph:map-pin",
    text: `${point.latitude}, ${point.longitude}`,
  },
])
</script>

<template>
  <dl class="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
    <div>
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.status") }}
      </dt>
      <dd data-testid="points-of-sale-panel-status">
        <Badge :variant="status.variant">
          {{ status.text }}
        </Badge>
      </dd>
    </div>

    <div>
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.cle") }}
      </dt>
      <dd data-testid="points-of-sale-panel-cle" class="font-mono text-foreground">
        {{ point.cle }}
      </dd>
    </div>

    <div class="sm:col-span-2">
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.address") }}
      </dt>
      <dd data-testid="points-of-sale-panel-address" class="text-foreground">
        {{ point.quartier }}, {{ point.ville }}
      </dd>
    </div>

    <div class="sm:col-span-2">
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.repere") }}
      </dt>
      <dd data-testid="points-of-sale-panel-repere" class="text-foreground">
        {{ point.repere }}
      </dd>
    </div>

    <div class="sm:col-span-2">
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.telephones") }}
      </dt>
      <dd class="text-foreground">
        <ol v-if="telephones.length" data-testid="points-of-sale-panel-telephones" class="space-y-1.5">
          <li
            v-for="telephone in telephones"
            :key="telephone.numero"
            class="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <a :href="telephone.tel" class="underline-offset-4 hover:underline">{{ telephone.numero }}</a>
            <a
              v-if="telephone.whatsappHref"
              data-testid="points-of-sale-panel-whatsapp"
              :href="telephone.whatsappHref"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <Icon name="ph:whatsapp-logo" size="14" aria-hidden="true" />
              {{ t("pointsOfSale.panel.whatsapp") }}
            </a>
          </li>
        </ol>
        <span v-else class="text-muted-foreground">{{ t("pointsOfSale.panel.notProvided") }}</span>
      </dd>
    </div>

    <div class="sm:col-span-2">
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.horaires") }}
      </dt>
      <dd data-testid="points-of-sale-panel-horaires" class="whitespace-pre-line" :class="horaires.className">
        {{ horaires.text }}
      </dd>
    </div>

    <div v-for="link in mapLinks" :key="link.key">
      <dt class="text-muted-foreground">
        {{ link.label }}
      </dt>
      <dd class="text-foreground">
        <a
          v-if="link.href"
          :data-testid="link.testid"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
        >
          <Icon :name="link.icon" size="16" aria-hidden="true" />
          {{ link.text }}
        </a>
        <span v-else class="text-muted-foreground">{{ t("pointsOfSale.panel.notProvided") }}</span>
      </dd>
    </div>

    <div class="sm:col-span-2">
      <dt class="text-muted-foreground">
        {{ t("pointsOfSale.panel.modified") }}
      </dt>
      <dd data-testid="points-of-sale-panel-modified" class="text-foreground">
        <span>{{ formatDateCourte(point.modifiee_le, locale) }}</span>
        <span v-if="point.modifiee_par" class="text-muted-foreground"> · {{ point.modifiee_par }}</span>
      </dd>
    </div>
  </dl>
</template>
