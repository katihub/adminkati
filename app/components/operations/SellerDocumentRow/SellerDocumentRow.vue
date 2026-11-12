<script setup lang="ts">
import type { SellerDocument } from "@/types/api/marketplace-moderation"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * One document of a seller file, with its review actions. Moved out of the onboarding workspace on
 * 12 November 2026 so a type can show its document in force and, folded below, the versions it replaced.
 */
const {
  document,
  label,
  isNew = false,
  replaced = false,
  pending,
  opening,
  selected,
} = defineProps<{
  document: SellerDocument
  label: string
  /** Sent after the last refusal of a document of this type. */
  isNew?: boolean
  /** An older version, replaced by a newer document of the same type. */
  replaced?: boolean
  pending: boolean
  opening: boolean
  selected: boolean
}>()
const reason = defineModel<string>("reason", { required: true })
defineEmits<{ open: []; claim: []; decide: []; refuse: []; validate: [] }>()
const { locale, t } = useI18n()

const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const statusKeys: Record<string, string> = {
  soumis: "operations.onboarding.documentStatus.submitted",
  en_verification: "operations.onboarding.documentStatus.reviewing",
  valide: "operations.onboarding.documentStatus.validated",
  refuse: "operations.onboarding.documentStatus.refused",
  expire: "operations.onboarding.documentStatus.expired",
}
const statusLabel = computed(() => (statusKeys[document.statut] ? t(statusKeys[document.statut]!) : document.statut))
</script>

<template>
  <li
    class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    :class="replaced ? 'bg-muted/40 opacity-80' : ''"
    :data-testid="`seller-document-${document.id}`"
  >
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <strong class="text-sm">{{ label }}</strong
        ><Badge variant="outline" class="text-[10px]">{{ statusLabel }}</Badge
        ><Badge
          v-if="isNew"
          class="border-0 bg-emerald-600 px-1.5 text-[10px] text-white"
          :data-testid="`seller-document-new-${document.id}`"
          >{{ t("operations.onboarding.newSinceRefusal") }}</Badge
        >
      </div>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t("operations.onboarding.submittedOn", { date: date.format(new Date(document.creeLe)) })
        }}<template v-if="document.expireLe">
          · {{ t("operations.onboarding.expiresOn", { date: date.format(new Date(document.expireLe)) }) }}</template
        >
      </p>
      <p v-if="document.nomFichier" class="mt-1 text-xs text-muted-foreground">
        {{ document.nomFichier }}
        <template v-if="document.statutAnalyse === 'saine'"> · {{ t("operations.onboarding.scanClean") }}</template>
      </p>
      <p v-else class="mt-1 text-xs text-muted-foreground">{{ t("operations.onboarding.legacyKey") }}</p>
      <p v-if="document.motifDecision" class="mt-2 text-xs text-destructive">{{ document.motifDecision }}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button
        v-if="document.typeMime && document.statutAnalyse !== 'infectee'"
        size="sm"
        variant="ghost"
        :disabled="opening"
        :data-testid="`seller-document-open-${document.id}`"
        @click="$emit('open')"
        ><Icon name="ph:file-arrow-down" /> {{ t("operations.onboarding.openFile") }}</Button
      >
      <Button
        v-if="document.statut === 'soumis'"
        size="sm"
        variant="outline"
        :disabled="pending"
        @click="$emit('claim')"
        >{{ t("operations.onboarding.claim") }}</Button
      >
      <Button v-if="document.statut === 'en_verification'" size="sm" variant="outline" @click="$emit('decide')">{{
        t("operations.onboarding.decide")
      }}</Button>
    </div>
    <div v-if="selected" class="grid gap-2 rounded-md bg-muted p-3 sm:col-span-2">
      <label class="text-xs font-medium">{{ t("operations.onboarding.refusalReason") }}</label>
      <textarea
        v-model="reason"
        rows="3"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div class="flex justify-end gap-2">
        <Button size="sm" variant="outline" :disabled="pending || reason.trim().length < 5" @click="$emit('refuse')">{{
          t("operations.onboarding.refuse")
        }}</Button
        ><Button size="sm" :disabled="pending" @click="$emit('validate')">{{
          t("operations.onboarding.validate")
        }}</Button>
      </div>
    </div>
  </li>
</template>
