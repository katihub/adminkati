<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the weekly report, the review queue, its teaching dialog and the corrections list
import type { KatiCorrectionKind, KatiReviewItem } from "@/composables/useKatiApprentissage"
import { computed, reactive, ref } from "vue"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useKatiCorrections, useKatiMutations, useKatiReport, useKatiReview } from "@/composables/useKatiApprentissage"
import { useToastAction } from "@/composables/useToastAction"

const { t, locale } = useI18n()
const days = ref(30)
const review = useKatiReview(days)
const report = useKatiReport(7)
const corrections = useKatiCorrections()
const mutations = useKatiMutations()
const run = useToastAction()
const pending = computed(() => Object.values(mutations).some(mutation => mutation.isPending.value))

const teaching = ref<{ genre: KatiCorrectionKind; item: KatiReviewItem | null } | null>(null)
const form = reactive({ expression: "", cible: "" })
const formError = computed(() => {
  if (form.expression.trim().length < 2) return t("assistant.kati.form.expressionRequired")
  if (form.cible.trim().length < 2) return t("assistant.kati.form.targetRequired")
  return ""
})

const number = computed(() => new Intl.NumberFormat(locale.value))
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))
const activeCorrections = computed(() => (corrections.data.value ?? []).filter(correction => correction.active))

function typeLabel(type: string) {
  const key = `assistant.kati.types.${type}`
  const label = t(key)
  return label === key ? type : label
}

function openTeach(genre: KatiCorrectionKind, item: KatiReviewItem | null = null) {
  form.expression = item?.question ?? ""
  form.cible = ""
  teaching.value = { genre, item }
}

async function submit() {
  const current = teaching.value
  if (!current || formError.value) return
  const done = await run(
    () =>
      mutations.teach.mutateAsync({
        genre: current.genre,
        expression: form.expression.trim(),
        cible: form.cible.trim(),
        ...(current.item ? { tours: current.item.ids } : {}),
      }),
    t("assistant.kati.toast.taught"),
  )
  if (done) teaching.value = null
}

function markReviewed(item: KatiReviewItem) {
  void run(() => mutations.markReviewed.mutateAsync(item.ids), t("assistant.kati.toast.reviewed"))
}

function withdraw(id: string) {
  void run(() => mutations.withdraw.mutateAsync(id), t("assistant.kati.toast.withdrawn"))
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="kati-review-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("assistant.kati.help") }}</p>
    </div>

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <section data-testid="kati-report">
        <h3 class="mb-3 font-heading font-semibold">{{ t("assistant.kati.report.title") }}</h3>
        <div v-if="report.isPending.value" class="h-20 animate-pulse rounded-lg bg-muted" />
        <ApiErrorCard v-else-if="report.error.value" :error="report.error.value" @retry="() => report.refetch()" />
        <dl v-else-if="report.data.value" class="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div class="rounded-lg border border-border bg-card p-3">
            <dt class="text-xs text-muted-foreground">{{ t("assistant.kati.report.questions") }}</dt>
            <dd class="text-xl font-semibold">{{ number.format(report.data.value.questions) }}</dd>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <dt class="text-xs text-muted-foreground">{{ t("assistant.kati.report.understood") }}</dt>
            <dd class="text-xl font-semibold">{{ report.data.value.tauxComprehension }} %</dd>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <dt class="text-xs text-muted-foreground">{{ t("assistant.kati.report.handedOver") }}</dt>
            <dd class="text-xl font-semibold">{{ report.data.value.tauxPassation }} %</dd>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <dt class="text-xs text-muted-foreground">{{ t("assistant.kati.report.aiShare") }}</dt>
            <dd class="text-xl font-semibold">{{ report.data.value.partIa }} %</dd>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <dt class="text-xs text-muted-foreground">{{ t("assistant.kati.report.tokens") }}</dt>
            <dd class="text-xl font-semibold">
              {{ number.format(report.data.value.jetons.entree + report.data.value.jetons.sortie) }}
            </dd>
          </div>
        </dl>
        <div v-if="report.data.value?.plusFrequentes.length" class="mt-3 rounded-lg border border-border bg-card p-3">
          <p class="mb-2 text-xs font-medium text-muted-foreground">{{ t("assistant.kati.report.frequent") }}</p>
          <ol class="space-y-1 text-sm">
            <li
              v-for="entry in report.data.value.plusFrequentes"
              :key="entry.question"
              class="flex justify-between gap-3"
            >
              <span class="truncate">{{ entry.question }}</span>
              <span class="shrink-0 text-muted-foreground">× {{ entry.frequence }}</span>
            </li>
          </ol>
        </div>
      </section>

      <section data-testid="kati-review-list">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-heading font-semibold">{{ t("assistant.kati.review.title") }}</h3>
          <NativeSelect v-model.number="days" class="w-40" :aria-label="t('assistant.kati.review.period')">
            <NativeSelectOption :value="7">{{ t("assistant.kati.review.days", { days: 7 }) }}</NativeSelectOption>
            <NativeSelectOption :value="30">{{ t("assistant.kati.review.days", { days: 30 }) }}</NativeSelectOption>
            <NativeSelectOption :value="90">{{ t("assistant.kati.review.days", { days: 90 }) }}</NativeSelectOption>
          </NativeSelect>
        </div>
        <div v-if="review.isPending.value" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
        <ApiErrorCard v-else-if="review.error.value" :error="review.error.value" @retry="() => review.refetch()" />
        <EmptyStateCard
          v-else-if="!review.data.value?.elements.length"
          icon="ph:sparkle"
          :text="t('assistant.kati.review.empty')"
        />
        <ul v-else class="space-y-2">
          <li
            v-for="item in review.data.value.elements"
            :key="item.ids[0]"
            class="rounded-lg border border-border bg-card px-4 py-3"
            data-testid="kati-review-item"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 space-y-1">
                <p class="font-medium break-words">« {{ item.question }} »</p>
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">× {{ item.frequence }}</Badge>
                  <Badge v-for="type in item.types" :key="type" variant="outline">{{ typeLabel(type) }}</Badge>
                  <span>{{ t("assistant.kati.review.last", { date: date.format(new Date(item.dernierLe)) }) }}</span>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" :disabled="pending" @click="openTeach('synonyme', item)">
                  <Icon name="ph:arrows-left-right" /> {{ t("assistant.kati.actions.synonym") }}
                </Button>
                <Button size="sm" variant="outline" :disabled="pending" @click="openTeach('exemple', item)">
                  <Icon name="ph:check-circle" /> {{ t("assistant.kati.actions.example") }}
                </Button>
                <Button size="sm" variant="ghost" :disabled="pending" @click="markReviewed(item)">
                  {{ t("assistant.kati.actions.reviewed") }}
                </Button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section data-testid="kati-corrections">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-heading font-semibold">{{ t("assistant.kati.corrections.title") }}</h3>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" :disabled="pending" @click="openTeach('synonyme')">
              <Icon name="ph:plus" /> {{ t("assistant.kati.actions.synonym") }}
            </Button>
            <Button size="sm" variant="outline" :disabled="pending" @click="openTeach('exemple')">
              <Icon name="ph:plus" /> {{ t("assistant.kati.actions.example") }}
            </Button>
          </div>
        </div>
        <ApiErrorCard
          v-if="corrections.error.value"
          :error="corrections.error.value"
          @retry="() => corrections.refetch()"
        />
        <EmptyStateCard
          v-else-if="!corrections.isPending.value && !activeCorrections.length"
          icon="ph:book-open"
          :text="t('assistant.kati.corrections.empty')"
        />
        <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
          <li
            v-for="correction in activeCorrections"
            :key="correction.id"
            class="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0 text-sm">
              <Badge variant="outline" class="mr-2">{{ t(`assistant.kati.kinds.${correction.genre}`) }}</Badge>
              <span class="font-medium">« {{ correction.expression }} »</span>
              <span class="text-muted-foreground"> → {{ correction.cible }}</span>
              <p v-if="correction.creePar" class="mt-1 text-xs text-muted-foreground">
                {{ t("assistant.kati.corrections.by", { name: correction.creePar }) }}
              </p>
            </div>
            <Button size="sm" variant="ghost" :disabled="pending" @click="withdraw(correction.id)">
              {{ t("assistant.kati.actions.withdraw") }}
            </Button>
          </li>
        </ul>
      </section>
    </div>

    <Dialog :open="Boolean(teaching)" @update:open="open => (open ? undefined : (teaching = null))">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t(`assistant.kati.form.title.${teaching?.genre ?? "synonyme"}`) }}</DialogTitle>
          <DialogDescription>{{ t(`assistant.kati.form.help.${teaching?.genre ?? "synonyme"}`) }}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="kati-expression">{{
              t(`assistant.kati.form.expression.${teaching?.genre ?? "synonyme"}`)
            }}</Label>
            <Input id="kati-expression" v-model="form.expression" maxlength="200" data-testid="kati-expression" />
          </div>
          <div class="space-y-2">
            <Label for="kati-target">{{ t(`assistant.kati.form.target.${teaching?.genre ?? "synonyme"}`) }}</Label>
            <Input
              v-if="teaching?.genre === 'synonyme'"
              id="kati-target"
              v-model="form.cible"
              maxlength="200"
              data-testid="kati-target"
            />
            <Textarea
              v-else
              id="kati-target"
              v-model="form.cible"
              rows="5"
              maxlength="2000"
              data-testid="kati-target"
            />
          </div>
          <p v-if="formError && (form.expression || form.cible)" class="text-sm text-destructive">{{ formError }}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="teaching = null">{{
              t("assistant.kati.form.cancel")
            }}</Button>
            <Button type="submit" :disabled="pending || Boolean(formError)" data-testid="kati-submit">
              {{ t("assistant.kati.form.save") }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
