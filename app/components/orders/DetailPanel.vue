<script setup lang="ts">
import type { CommandeDetail, StatutCommande } from "@/types/api/commandes"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { useCachedSession } from "@/composables/useCachedSession"
import { useOrderMutations } from "@/composables/useOrderMutations"
import { apiErrorText } from "@/utils/api-error"
import { isOrderInPerimetre, moneyPerimetre } from "@/utils/comptoirs"
import { productNamesBySlug } from "@/utils/order-confirm-conflict"
import { eligibleTransitions } from "@/utils/order-transitions"

const { order } = defineProps<{
  order: CommandeDetail
}>()

const session = useCachedSession()
const { t } = useI18n()
const roles = computed(() => session.value?.roles ?? [])
const pendingTransition = ref<StatutCommande | null>(null)
const transitionOpen = ref(false)
const paymentOpen = ref(false)
const productNames = computed(() => productNamesBySlug(order.lignes))
const hasTransitions = computed(() => eligibleTransitions(order.statut, roles.value).length > 0)

/**
 * HORS PÉRIMÈTRE, LE BOUTON DISPARAÎT AU LIEU DE MENER À UN 403.
 *
 * Un membre rattaché à des comptoirs n'encaisse que les retraits des siens. Le
 * backend refuse le reste, en français, mais après le clic : l'opérateur a déjà
 * compté l'argent. La commande reste lisible — seule l'action s'en va, et une
 * ligne dit de quel comptoir elle relève.
 *
 * C'est le périmètre DE L'ARGENT, plus étroit que celui de la lecture : la
 * direction en sort même rattachée à des comptoirs, la préparation non — mais
 * elle n'encaisse de toute façon pas.
 */
const inPerimetre = computed(() => isOrderInPerimetre(moneyPerimetre(session.value), order.comptoir))
const canCollect = computed(
  () =>
    (roles.value.includes("direction") || roles.value.includes("comptoir")) &&
    inPerimetre.value &&
    (order.resteAPayer ?? 0) > 0,
)
const showsOutOfPerimetreNotice = computed(
  () =>
    !inPerimetre.value &&
    (roles.value.includes("direction") || roles.value.includes("comptoir")) &&
    (order.resteAPayer ?? 0) > 0,
)

/**
 * `POST /commandes/:reference/livreur` ÉTAIT INJOIGNABLE. La mutation existait,
 * aucun écran ne l'appelait : une affectation fausse ne se corrigeait nulle
 * part. Les trois conditions reproduisent celles du service — il refuse un
 * autre statut par un 409 et un autre mode de remise par un 400.
 */
const LIVREUR_STATUTS: readonly StatutCommande[] = ["confirmee", "en_preparation", "en_remise"]
const canAssignLivreur = computed(
  () =>
    order.modeRemise === "domicile" &&
    LIVREUR_STATUTS.includes(order.statut) &&
    (roles.value.includes("direction") || roles.value.includes("comptoir")),
)

const livreurOpen = ref(false)
const exportOpen = ref(false)
const livreurId = ref<string>()
const livreurError = ref("")
const mutation = useOrderMutations()
const livreurPending = computed(() => mutation.assignLivreur.isPending.value)
const hasActions = computed(
  () => hasTransitions.value || canCollect.value || canAssignLivreur.value || showsOutOfPerimetreNotice.value,
)
const actionsBusy = computed(() => transitionOpen.value || paymentOpen.value || livreurOpen.value)

watch(transitionOpen, open => {
  if (!open) pendingTransition.value = null
})

/* Pré-rempli avec le livreur en place : le geste courant est « changer », et
   partir du choix actuel dit lequel on remplace. */
watch(livreurOpen, open => {
  if (open) {
    livreurId.value = order.livreur?.id
    livreurError.value = ""
  }
})

function selectTransition(status: StatutCommande) {
  pendingTransition.value = status
  transitionOpen.value = true
}

function confirmLivreur() {
  if (!livreurId.value) return
  livreurError.value = ""
  mutation.assignLivreur.mutate(
    { reference: order.reference, input: { livreurId: livreurId.value } },
    {
      onSuccess: () => {
        livreurOpen.value = false
      },
      onError: (error: unknown) => {
        livreurError.value = apiErrorText(error, t)
      },
    },
  )
}
</script>

<template>
  <article data-testid="orders-detail-content">
    <OrdersDetailHeader :order="order">
      <template #actions>
        <Button type="button" variant="outline" data-testid="orders-detail-export-trigger" @click="exportOpen = true">
          <Icon name="ph:file-pdf" size="18" aria-hidden="true" />
          {{ t("orders.export.trigger") }}
        </Button>
        <OrdersHeaderActions
          v-if="hasActions"
          v-model:payment-open="paymentOpen"
          :order="order"
          :roles="roles"
          :can-assign-livreur="canAssignLivreur"
          :livreur-pending="livreurPending"
          :in-perimetre="inPerimetre"
          :shows-out-of-perimetre-notice="showsOutOfPerimetreNotice"
          :actions-busy="actionsBusy"
          @assign-livreur="livreurOpen = true"
          @select="selectTransition"
        />
      </template>
    </OrdersDetailHeader>
    <OrdersExportDialog v-model:open="exportOpen" :reference="order.reference" />
    <OrdersTransitionDialog
      v-if="pendingTransition"
      v-model:open="transitionOpen"
      :reference="order.reference"
      :transition="pendingTransition"
      :mode-remise="order.modeRemise"
      :confirme-par-client="order.confirmeParClient"
      :recu-le="order.recuLe"
      :product-names="productNames"
    />
    <OrdersLivreurDialog
      v-if="canAssignLivreur"
      v-model:open="livreurOpen"
      v-model:livreur-id="livreurId"
      :reference="order.reference"
      :pending="livreurPending"
      :error="livreurError"
      @confirm="confirmLivreur"
    />
    <div class="grid w-full min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-5">
        <OrdersBasicDetails :order="order" />
        <OrdersLinesTable :lines="order.lignes" class="flex-1" />
      </div>
      <div class="flex min-w-0 flex-col gap-5">
        <OrdersPaymentStatus :order="order" :can-collect="canCollect" @collect="paymentOpen = true" />
        <OrdersMobileMoneyRequest v-if="canCollect && (order.resteAPayer ?? 0) > 0" :order="order" />
        <OrdersCustomerInfo
          :order="order"
          :can-assign-livreur="canAssignLivreur"
          :livreur-pending="livreurPending"
          @assign-livreur="livreurOpen = true"
        />
        <OrdersRecordedEvents :order="order" />
      </div>
    </div>
  </article>
</template>
