<script setup lang="ts">
import type { CommandeDetail, StatutCommande } from "@/types/api/commandes"
import type { TeamRole } from "@/types/api/equipe"
import { Button } from "@/components/ui/button"

defineProps<{
  order: CommandeDetail
  roles: TeamRole[]
  canAssignLivreur: boolean
  livreurPending: boolean
  inPerimetre: boolean
  showsOutOfPerimetreNotice: boolean
  actionsBusy: boolean
}>()

const emit = defineEmits<{
  assignLivreur: []
  select: [status: StatutCommande]
}>()

const paymentOpen = defineModel<boolean>("paymentOpen", { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2" data-testid="orders-detail-actions">
    <Button
      v-if="canAssignLivreur"
      type="button"
      variant="outline"
      data-testid="orders-detail-livreur-trigger"
      :disabled="livreurPending"
      @click="emit('assignLivreur')"
    >
      <Icon name="ph:motorcycle" size="18" aria-hidden="true" />
      {{ order.livreur ? t("orders.actions.livreurDialog.change") : t("orders.actions.livreurDialog.assign") }}
    </Button>
    <p
      v-if="showsOutOfPerimetreNotice"
      class="text-xs text-muted-foreground"
      data-testid="orders-detail-out-of-perimetre"
    >
      {{ t("orders.detail.outOfPerimetre") }}
    </p>
    <OrdersPaymentDialog
      v-model:open="paymentOpen"
      :reference="order.reference"
      :remaining="order.resteAPayer"
      :roles="roles"
      :status="order.statut"
      :in-perimetre="inPerimetre"
    />
    <OrdersActionBar :status="order.statut" :roles="roles" :busy="actionsBusy" @select="emit('select', $event)" />
  </div>
</template>
