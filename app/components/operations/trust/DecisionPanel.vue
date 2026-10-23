<script setup lang="ts">
import type { SellerTrustDetail } from "@/types/api/marketplace-operations"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { useSellerTrustMutations } from "@/composables/useMarketplaceOperations"
import { SANCTION_REASON_MIN } from "@/types/api/marketplace-operations"
import { apiErrorText } from "@/utils/api-error"

const props = defineProps<{ seller: SellerTrustDetail }>()

const { t } = useI18n()
const { rehabilitate, arbitrate } = useSellerTrustMutations()
const reason = ref("")

const liftable = computed(() =>
  props.seller.sanctions.find(item => ["active", "contestee", "confirmee"].includes(item.statut)),
)
const contested = computed(() => props.seller.sanctions.find(item => item.statut === "contestee"))
const reasonTooShort = computed(() => reason.value.trim().length < SANCTION_REASON_MIN)
const pending = computed(() => rehabilitate.isPending.value || arbitrate.isPending.value)

watch(
  () => props.seller.id,
  () => {
    reason.value = ""
  },
)

async function run(action: () => Promise<unknown>, done: string) {
  if (reasonTooShort.value || pending.value) return
  try {
    await action()
    reason.value = ""
    toast.success(t(done))
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}

function rehabilitateSeller() {
  const sanction = liftable.value
  if (!sanction) return
  void run(
    () => rehabilitate.mutateAsync({ sellerId: props.seller.id, sanctionId: sanction.id, motif: reason.value.trim() }),
    "operations.trust.rehabilitated",
  )
}

function arbitrateSanction(decision: "confirmee" | "levee") {
  const sanction = contested.value
  if (!sanction) return
  void run(
    () =>
      arbitrate.mutateAsync({
        sellerId: props.seller.id,
        sanctionId: sanction.id,
        decision,
        motif: reason.value.trim(),
      }),
    `operations.trust.arbitrated.${decision}`,
  )
}
</script>

<template>
  <section class="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24">
    <h3 class="font-heading text-base font-semibold">{{ t("operations.trust.decision") }}</h3>
    <p v-if="contested" class="mt-2 rounded-md bg-muted p-2 text-xs" data-testid="seller-contestation">
      <strong>{{ t("operations.trust.contestation") }}</strong> {{ contested.motifContestation }}
    </p>
    <label for="rehabilitation-reason" class="mt-4 block text-sm font-medium">{{
      t("operations.trust.decisionReason")
    }}</label>
    <textarea
      id="rehabilitation-reason"
      v-model="reason"
      rows="5"
      maxlength="1000"
      data-testid="seller-decision-reason"
      class="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
    <p class="text-xs text-muted-foreground">{{ t("operations.trust.reasonMin", { min: SANCTION_REASON_MIN }) }}</p>
    <Button
      class="mt-3 w-full"
      :disabled="!seller.capacites.rehabiliter || reasonTooShort || pending"
      data-testid="seller-rehabilitate"
      @click="rehabilitateSeller"
      ><Icon name="ph:shield-check" /> {{ t("operations.trust.rehabilitate") }}</Button
    >
    <div v-if="seller.capacites.arbitrer" class="mt-2 grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        :disabled="reasonTooShort || pending"
        data-testid="seller-arbitrate-confirm"
        @click="arbitrateSanction('confirmee')"
        ><Icon name="ph:scales" /> {{ t("operations.trust.confirm") }}</Button
      >
      <Button
        variant="outline"
        :disabled="reasonTooShort || pending"
        data-testid="seller-arbitrate-lift"
        @click="arbitrateSanction('levee')"
        >{{ t("operations.trust.lift") }}</Button
      >
    </div>
    <p v-else-if="contested" class="mt-2 text-xs text-muted-foreground">{{ t("operations.trust.ownDecision") }}</p>
  </section>
</template>
