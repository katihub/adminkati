<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: commissions under review, sponsorships and one reason dialog
import { computed, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useKatiMutations, useKatiSponsorships } from "@/composables/useKati"
import { useToastAction } from "@/composables/useToastAction"

type Pending = { kind: "commission" | "sponsorship"; id: string; label: string }

const { t, locale } = useI18n()
const filter = ref<"en_revue" | "tous">("en_revue")
const query = useKatiSponsorships(filter)
const { validateCommission, cancelCommission, revokeSponsorship } = useKatiMutations()
const run = useToastAction()
const reasonFor = ref<Pending | null>(null)
const reason = ref("")
const pending = computed(
  () => validateCommission.isPending.value || cancelCommission.isPending.value || revokeSponsorship.isPending.value,
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }))
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const nameOf = (person: { id: string; profil: { nom: string | null } | null }) =>
  person.profil?.nom ?? person.id.slice(0, 8)

function ask(kind: Pending["kind"], id: string, label: string) {
  reason.value = ""
  reasonFor.value = { kind, id, label }
}

const askCommission = (id: string, label: string) => ask("commission", id, label)
const askSponsorship = (id: string, label: string) => ask("sponsorship", id, label)
const cancellingCommission = computed(() => reasonFor.value?.kind === "commission")

async function confirmReason() {
  const target = reasonFor.value
  const motif = reason.value.trim()
  if (!target || motif.length < 5) return
  const done =
    target.kind === "commission"
      ? await run(
          () => cancelCommission.mutateAsync({ id: target.id, motif }),
          t("operations.kati.sponsorships.cancelled"),
        )
      : await run(
          () => revokeSponsorship.mutateAsync({ id: target.id, motif }),
          t("operations.kati.sponsorships.revokedDone"),
        )
  if (done) reasonFor.value = null
}
</script>

<template>
  <div class="space-y-4" data-testid="kati-sponsorships">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.kati.sponsorships.help") }}</p>
      <NativeSelect
        v-model="filter"
        :aria-label="t('operations.kati.sponsorships.filter')"
        data-testid="kati-sponsorships-filter"
      >
        <NativeSelectOption value="en_revue">{{ t("operations.kati.sponsorships.underReview") }}</NativeSelectOption>
        <NativeSelectOption value="tous">{{ t("operations.kati.sponsorships.all") }}</NativeSelectOption>
      </NativeSelect>
    </div>
    <div v-if="query.isPending.value" class="space-y-2">
      <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
    </div>
    <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <template v-else-if="query.data.value">
      <template v-if="filter === 'en_revue'">
        <EmptyStateCard
          v-if="!query.data.value.attributions.length"
          icon="ph:check-circle"
          :text="t('operations.kati.sponsorships.noReview')"
        />
        <ul v-else class="grid gap-3">
          <li
            v-for="commission in query.data.value.attributions"
            :key="commission.id"
            class="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4"
            :data-testid="`kati-commission-${commission.id}`"
          >
            <div class="min-w-0 flex-1">
              <h3 class="font-heading font-semibold">{{ commission.commande.reference }}</h3>
              <p v-if="commission.parrainage" class="mt-1 text-xs text-muted-foreground">
                {{
                  t("operations.kati.sponsorships.pair", {
                    sponsor: nameOf(commission.parrainage.parrain),
                    godchild: nameOf(commission.parrainage.filleul),
                  })
                }}
                · {{ money.format(commission.commande.totalFermeTtc) }} · {{ date.format(new Date(commission.creeLe)) }}
              </p>
              <p class="mt-1 text-sm">{{ commission.motifRevue }}</p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Button
                size="sm"
                :disabled="pending"
                data-testid="kati-commission-validate"
                @click="
                  run(() => validateCommission.mutateAsync(commission.id), t('operations.kati.sponsorships.validated'))
                "
                >{{ t("operations.kati.sponsorships.validate") }}</Button
              >
              <Button
                size="sm"
                variant="ghost"
                class="text-destructive"
                :disabled="pending"
                data-testid="kati-commission-cancel"
                @click="askCommission(commission.id, commission.commande.reference)"
                >{{ t("operations.kati.sponsorships.cancel") }}</Button
              >
            </div>
          </li>
        </ul>
      </template>
      <template v-else>
        <EmptyStateCard
          v-if="!query.data.value.parrainages.length"
          icon="ph:users-three"
          :text="t('operations.kati.sponsorships.none')"
        />
        <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
          <li
            v-for="sponsorship in query.data.value.parrainages"
            :key="sponsorship.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
            :data-testid="`kati-sponsorship-${sponsorship.id}`"
          >
            <div class="min-w-0 flex-1 text-sm">
              <span class="font-medium">{{
                t("operations.kati.sponsorships.pair", {
                  sponsor: nameOf(sponsorship.parrain),
                  godchild: nameOf(sponsorship.filleul),
                })
              }}</span>
              <span class="block text-xs text-muted-foreground">
                {{
                  t("operations.kati.sponsorships.period", {
                    from: date.format(new Date(sponsorship.attacheLe)),
                    to: date.format(new Date(sponsorship.expireLe)),
                  })
                }}
                · {{ t("operations.kati.sponsorships.orders", { count: sponsorship._count.attributions }) }}
              </span>
              <span v-if="sponsorship.motifRevocation" class="block text-xs text-destructive">{{
                sponsorship.motifRevocation
              }}</span>
            </div>
            <Badge v-if="sponsorship.statut === 'revoque'" variant="outline">{{
              t("operations.kati.sponsorships.revoked")
            }}</Badge>
            <Button
              v-else
              size="sm"
              variant="ghost"
              class="text-destructive"
              :disabled="pending"
              data-testid="kati-sponsorship-revoke"
              @click="askSponsorship(sponsorship.id, nameOf(sponsorship.filleul))"
              >{{ t("operations.kati.sponsorships.revoke") }}</Button
            >
          </li>
        </ul>
      </template>
    </template>

    <Dialog :open="Boolean(reasonFor)" @update:open="value => (value ? null : (reasonFor = null))">
      <DialogContent data-testid="kati-reason-form">
        <DialogHeader>
          <DialogTitle>{{
            cancellingCommission
              ? t("operations.kati.sponsorships.cancelTitle")
              : t("operations.kati.sponsorships.revokeTitle")
          }}</DialogTitle>
          <DialogDescription>{{
            cancellingCommission
              ? t("operations.kati.sponsorships.cancelHelp", { order: reasonFor?.label ?? "" })
              : t("operations.kati.sponsorships.revokeHelp", { name: reasonFor?.label ?? "" })
          }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="confirmReason">
          <div class="grid gap-2">
            <Label for="kati-reason">{{ t("operations.kati.sponsorships.reason") }}</Label>
            <Textarea id="kati-reason" v-model="reason" rows="3" maxlength="300" data-testid="kati-reason" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="pending" @click="reasonFor = null">{{
              t("operations.kati.cancel")
            }}</Button>
            <Button
              type="submit"
              variant="destructive"
              :disabled="pending || reason.trim().length < 5"
              data-testid="kati-reason-submit"
              >{{ t("operations.kati.sponsorships.confirm") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
