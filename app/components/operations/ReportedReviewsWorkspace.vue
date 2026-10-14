<script setup lang="ts">
// fallow-ignore-file complexity -- declarative moderation queue with one decision form per review
import type { ReportedReview } from "@/composables/useReportedReviews"
import { computed, reactive } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useReportedReviews, useReviewModeration } from "@/composables/useReportedReviews"
import { apiErrorText } from "@/utils/api-error"

const { t, locale } = useI18n()
const query = useReportedReviews()
const moderation = useReviewModeration()
const reasons = reactive<Record<string, string>>({})
const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))

/** `signale` means hidden by the reporting threshold, pending a decision. */
const HIDDEN_STATUS = "signale"
const TEAM_REPORTER = "equipe"

function isHidden(review: ReportedReview) {
  return review.statut === HIDDEN_STATUS
}

function statusLabel(review: ReportedReview) {
  return isHidden(review)
    ? t("operations.reportedReviews.hiddenPending")
    : t("operations.reportedReviews.stillPublished")
}

function reporter(type: string) {
  return type === TEAM_REPORTER ? t("operations.reportedReviews.byKatihub") : t("operations.reportedReviews.byShop")
}

async function decide(review: ReportedReview, statut: "publie" | "masque") {
  const motif = (reasons[review.id] ?? "").trim()
  if (motif.length < 5) return
  try {
    await moderation.mutateAsync({ id: review.id, statut, motif })
    toast.success(t(statut === "publie" ? "operations.reportedReviews.kept" : "operations.reportedReviews.hidden"))
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="reported-reviews-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.reportedReviews.help") }}</p>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.length"
        icon="ph:flag"
        :text="t('operations.reportedReviews.empty')"
      />
      <ul v-else class="space-y-3">
        <li
          v-for="review in query.data.value"
          :key="review.id"
          class="rounded-lg border border-border bg-card p-4"
          :data-testid="`reported-review-${review.id}`"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <strong>{{ "★".repeat(review.note) }}{{ "☆".repeat(5 - review.note) }}</strong>
                <span class="text-sm"
                  >{{ review.auteur }}<template v-if="review.ville"> · {{ review.ville }}</template></span
                >
                <Badge :variant="isHidden(review) ? 'destructive' : 'outline'">{{ statusLabel(review) }}</Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ review.ligne.sousCommande.boutique.nom }} · {{ review.ligne.offreTitreCapture }} ·
                {{ review.ligne.sousCommande.reference }} · {{ date.format(new Date(review.creeLe)) }}
              </p>
            </div>
          </div>
          <p class="mt-3 whitespace-pre-line text-sm">
            {{ review.commentaire || t("operations.reportedReviews.noComment") }}
          </p>
          <div class="mt-3 rounded-md border border-amber-300 bg-amber-50/40 p-3">
            <p class="text-xs font-medium">
              {{ t("operations.reportedReviews.reports", { count: review.signalements.length }) }}
            </p>
            <ul class="mt-1 space-y-1 text-xs text-muted-foreground">
              <li v-for="report in review.signalements" :key="report.id">
                {{ reporter(report.auteurType) }}
                · {{ date.format(new Date(report.creeLe)) }} : « {{ report.motif }} »
              </li>
            </ul>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label class="text-xs font-medium">
              {{ t("operations.reportedReviews.reason") }}
              <input
                v-model="reasons[review.id]"
                class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                maxlength="500"
                :data-testid="`reported-review-reason-${review.id}`"
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              :disabled="moderation.isPending.value || (reasons[review.id] ?? '').trim().length < 5"
              :data-testid="`reported-review-keep-${review.id}`"
              @click="decide(review, 'publie')"
              >{{ t("operations.reportedReviews.keep") }}</Button
            >
            <Button
              size="sm"
              variant="destructive"
              :disabled="moderation.isPending.value || (reasons[review.id] ?? '').trim().length < 5"
              :data-testid="`reported-review-hide-${review.id}`"
              @click="decide(review, 'masque')"
              >{{ t("operations.reportedReviews.hide") }}</Button
            >
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
