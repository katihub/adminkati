<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { Button } from "@/components/ui/button"

const {
  order,
  adresse,
  affecteLe,
  canAssignLivreur = false,
  livreurPending = false,
} = defineProps<{
  order: CommandeDetail
  adresse: string
  affecteLe: string
  canAssignLivreur?: boolean
  livreurPending?: boolean
}>()

const emit = defineEmits<{
  assignLivreur: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-3">
    <h4
      class="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
      data-testid="orders-detail-delivery-title"
    >
      <Icon name="ph:map-pin" size="14" aria-hidden="true" />
      {{ t("orders.detail.deliveryInfoTitle") }}
    </h4>

    <dl class="space-y-3">
      <!-- Address block -->
      <div class="rounded-xl bg-muted/40 p-4 space-y-2">
        <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon name="ph:map-pin-fill" size="13" aria-hidden="true" class="text-primary" />
          <dt>{{ t("orders.detail.deliveryAddress") }}</dt>
        </div>
        <dd class="text-xs sm:text-sm font-medium text-foreground" data-testid="orders-detail-delivery-address">
          {{ adresse || t("orders.detail.deliveryAddressUnavailable") }}
        </dd>

        <div
          v-if="order.adresseFigee?.repere"
          class="flex items-start gap-1.5 rounded-lg bg-primary/5 p-2.5 text-xs text-primary/90 font-medium"
        >
          <Icon name="ph:crosshair" size="14" aria-hidden="true" class="mt-0.5 shrink-0" />
          <span
            ><strong>{{ t("orders.detail.landmark") }} :</strong> {{ order.adresseFigee.repere }}</span
          >
        </div>

        <div v-if="order.telephoneLivraison" class="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <Icon name="ph:phone" size="13" aria-hidden="true" />
          <dt class="sr-only">
            {{ t("orders.detail.deliveryPhone") }}
          </dt>
          <dd>
            <a
              class="font-mono font-medium underline underline-offset-2 hover:text-primary text-foreground"
              data-testid="orders-detail-delivery-phone"
              :href="`tel:${order.telephoneLivraison.replace(/\s+/g, '')}`"
            >
              {{ order.telephoneLivraison }}
            </a>
          </dd>
        </div>
      </div>

      <!-- Courier block -->
      <div class="rounded-xl bg-muted/40 p-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="ph:motorcycle" size="16" aria-hidden="true" />
          </div>
          <div class="min-w-0 text-xs">
            <dt class="text-[11px] text-muted-foreground">
              {{ t("orders.detail.assignedCourier") }}
            </dt>
            <dd v-if="order.livreur" class="font-semibold text-foreground truncate" data-testid="orders-detail-courier">
              {{ order.livreur.nom }}
              <a
                v-if="order.livreur.telephone"
                class="font-mono font-normal underline underline-offset-2 hover:text-primary ml-1"
                data-testid="orders-detail-courier-phone"
                :href="`tel:${order.livreur.telephone.replace(/\s+/g, '')}`"
                >· {{ order.livreur.telephone }}</a
              >
              <span v-else class="text-muted-foreground font-normal ml-1" data-testid="orders-detail-courier-no-phone">
                · {{ t("orders.detail.courierNoPhone") }}
              </span>
            </dd>
            <dd v-else class="font-medium text-muted-foreground" data-testid="orders-detail-courier-unassigned">
              {{ t("orders.detail.courierUnassigned") }}
            </dd>
            <dd
              v-if="affecteLe"
              class="text-[10px] text-muted-foreground font-mono mt-0.5"
              data-testid="orders-detail-courier-assigned-at"
            >
              {{ t("orders.detail.courierAssignedAt", { date: affecteLe }) }}
            </dd>
          </div>
        </div>

        <Button
          v-if="canAssignLivreur"
          type="button"
          variant="secondary"
          size="sm"
          class="h-8 px-3 text-xs rounded-lg shrink-0 flex items-center gap-1 font-medium"
          :disabled="livreurPending"
          @click="emit('assignLivreur')"
        >
          <Icon name="ph:user-switch" size="14" aria-hidden="true" />
          <span>{{
            order.livreur ? t("orders.actions.livreurDialog.change") : t("orders.actions.livreurDialog.assign")
          }}</span>
        </Button>
      </div>
    </dl>
  </div>
</template>
