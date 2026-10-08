<script setup lang="ts">
import type { EnrichedEcart } from "@/components/caisse/EcartsList.vue"
import type { EnrichedEncaissement } from "@/components/caisse/EncaissementsTable.vue"
import type { CaisseDetail } from "@/types/api/caisse"
import { computed } from "vue"
import { useCachedSession } from "@/composables/useCachedSession"
import { useTeamRoster } from "@/composables/useTeamRoster"
import { canCountCaisse, countDisabledReason, validateDisabledReason } from "@/utils/caisse-duty"
import { resolveMemberName } from "@/utils/resolve-member-name"

const { caisse } = defineProps<{ caisse: CaisseDetail }>()

const { t } = useI18n()
const { members } = useTeamRoster()
const session = useCachedSession()

const showCount = computed(() => caisse.statut === "ouverte" || caisse.statut === "litige")
const canCount = computed(() => (session.value ? canCountCaisse(caisse, session.value.membreId) : false))
const countReason = computed(() => (session.value ? countDisabledReason(caisse, session.value.membreId) : null))

/** `ouverte` is rejected by the backend outright — nothing to validate yet. */
const showValidate = computed(() => caisse.statut === "comptee" || caisse.statut === "litige")
const validateReason = computed(() => validateDisabledReason(caisse, session.value?.membreId ?? ""))
const canValidate = computed(() => validateReason.value === null)

/** Both actions only ever render together when disputed — validate is the resolving action there, so it stays primary and count steps back. */
const countVariant = computed(() => (caisse.statut === "litige" ? "outline" : "default"))

function memberName(id: string | null): string | null {
  if (!id) return null
  return resolveMemberName(id, members.value) ?? t("caisse.common.unknownMember")
}

const porteurName = computed(() => memberName(caisse.porteurId) ?? t("caisse.common.unknownMember"))
const counterName = computed(() => memberName(caisse.compteePar))
const validatorName = computed(() => memberName(caisse.valideePar))

const enrichedEncaissements = computed<EnrichedEncaissement[]>(() =>
  caisse.encaissements.map(line => ({
    ...line,
    collectedByName: memberName(line.encaissePar) ?? t("caisse.common.unknownMember"),
  })),
)

const enrichedEcarts = computed<EnrichedEcart[]>(() =>
  caisse.ecarts.map(line => ({
    ...line,
    arbitreName: memberName(line.arbitrePar) ?? t("caisse.common.unknownMember"),
  })),
)
</script>

<template>
  <div data-testid="caisse-detail-panel" class="space-y-4">
    <CaisseDetailHeader :caisse="caisse" :porteur-name="porteurName">
      <template v-if="showCount || showValidate" #actions>
        <CaisseCountDialog
          v-if="showCount"
          :caisse-id="caisse.id"
          :variant="countVariant"
          :disabled="!canCount"
          :disabled-reason="countReason"
        />
        <CaisseValidateDialog
          v-if="showValidate"
          :caisse-id="caisse.id"
          :montant-attendu="caisse.montantAttendu"
          :montant-compte="caisse.montantCompte"
          :ecart="caisse.ecart"
          :counter-name="counterName"
          :disabled="!canValidate"
          :disabled-reason="validateReason"
        />
      </template>
    </CaisseDetailHeader>

    <div class="space-y-4 p-4 sm:p-6">
      <CaisseAmountSummary :caisse="caisse" :counter-name="counterName" :validator-name="validatorName" />
      <CaisseEncaissementsTable :encaissements="enrichedEncaissements" />
      <CaisseEcartsList :ecarts="enrichedEcarts" :statut="caisse.statut" />
    </div>
  </div>
</template>
