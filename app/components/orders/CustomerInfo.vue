<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { PhUserCircleMinus } from "@phosphor-icons/vue"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatDateCourte } from "@/utils/dates"

const {
  order,
  canAssignLivreur = false,
  livreurPending = false,
} = defineProps<{
  order: CommandeDetail
  canAssignLivreur?: boolean
  livreurPending?: boolean
}>()

const emit = defineEmits<{
  assignLivreur: []
}>()

const { locale, t } = useI18n()

/**
 * L'ADRESSE FIGÉE EST LA PORTE, et rien ne l'affichait.
 *
 * Le backend la recopie sur la commande précisément pour qu'archiver l'adresse
 * du client ne puisse pas la perdre ; le panneau la recevait depuis le premier
 * jour et n'en rendait aucun caractère. Le livreur partait avec une référence
 * et un nom.
 */
const adresse = computed(() => {
  const figee = order.adresseFigee
  if (!figee) return ""
  return [figee.ville, figee.quartier, figee.repere].filter(Boolean).join(" · ")
})

/* Une commande à domicile montre le bloc même vide : « aucun livreur affecté »
   est l'information, pas l'absence de bloc. */
const showDelivery = computed(
  () =>
    order.modeRemise === "domicile" ||
    Boolean(adresse.value) ||
    Boolean(order.telephoneLivraison) ||
    Boolean(order.livreur),
)

const affecteLe = computed(() => (order.livreurAffecteLe ? formatDateCourte(order.livreurAffecteLe, locale.value) : ""))
</script>

<template>
  <section class="rounded-2xl bg-card p-5 space-y-4" data-testid="orders-detail-customer-info">
    <div class="flex items-center gap-2">
      <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="ph:user" size="15" aria-hidden="true" />
      </div>
      <h3 class="font-heading text-sm font-semibold text-foreground">
        {{ t("orders.detail.customerInfoTitle") }}
      </h3>
    </div>

    <Empty v-if="!order.clientNom" class="p-6" data-testid="orders-detail-customer-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PhUserCircleMinus :size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("orders.detail.customerUnavailable") }}</EmptyTitle>
      </EmptyHeader>
    </Empty>

    <div v-else class="space-y-4">
      <dl class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <dt class="sr-only">
              {{ t("orders.detail.name") }}
            </dt>
            <dd
              class="font-semibold text-sm sm:text-base text-foreground truncate"
              data-testid="orders-detail-customer"
            >
              {{ order.clientNom }}
            </dd>
            <dt class="sr-only">
              {{ t("orders.detail.phone") }}
            </dt>
            <dd
              v-if="order.clientTelephone"
              class="font-mono text-xs text-muted-foreground mt-0.5"
              data-testid="orders-detail-phone"
            >
              {{ order.clientTelephone }}
            </dd>
          </div>

          <a
            v-if="order.clientTelephone"
            :href="`tel:${order.clientTelephone.replace(/\s+/g, '')}`"
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors"
            :title="t('orders.detail.call')"
          >
            <Icon name="ph:phone" size="15" aria-hidden="true" />
          </a>
        </div>
      </dl>

      <OrdersDeliveryInfo
        v-if="showDelivery"
        :order="order"
        :adresse="adresse"
        :affecte-le="affecteLe"
        :can-assign-livreur="canAssignLivreur"
        :livreur-pending="livreurPending"
        @assign-livreur="emit('assignLivreur')"
      />
    </div>
  </section>
</template>
