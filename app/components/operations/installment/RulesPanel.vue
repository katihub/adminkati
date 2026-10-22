<script setup lang="ts">
import type { InstallmentRule } from "@/types/api/installment-plans"
import { ref } from "vue"
import OperationsInstallmentRuleForm from "@/components/operations/installment/RuleForm.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useInstallmentSettings } from "@/composables/useInstallmentPlans"
import { formatMontant } from "@/utils/money"

const { t, locale } = useI18n()
const { rules } = useInstallmentSettings()
const editing = ref<string | null>(null)

const summary = (rule: InstallmentRule) =>
  t("operations.installments.rule.summary", {
    days: rule.dureeMaxJours,
    deposit: rule.apportInitialBps / 100,
    min: formatMontant(rule.versementMinFcfa, locale.value).exact,
    threshold: rule.seuilReservationBps / 100,
  })

const badge = (rule: InstallmentRule) =>
  rule.actif
    ? { variant: "default" as const, label: t("operations.installments.rule.on") }
    : { variant: "outline" as const, label: t("operations.installments.rule.off") }

function toggle(id: string) {
  editing.value = editing.value === id ? null : id
}
</script>

<template>
  <section class="mt-4 rounded-lg border border-border bg-card p-5">
    <h3 class="font-heading font-semibold">{{ t("operations.installments.rulesTitle") }}</h3>
    <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{{ t("operations.installments.rulesHelp") }}</p>
    <div v-if="rules.isPending.value" class="mt-4 space-y-2">
      <div v-for="n in 4" :key="n" class="h-12 animate-pulse rounded-lg bg-muted" />
    </div>
    <ApiErrorCard v-else-if="rules.error.value" :error="rules.error.value" @retry="rules.refetch()" />
    <ul v-else class="mt-4 divide-y divide-border">
      <li
        v-for="category in rules.data.value"
        :key="category.id"
        class="py-3"
        :data-testid="`installment-rule-${category.slug}`"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span class="min-w-0 flex-1 text-sm font-medium">
            {{ category.nom }}
            <Badge :variant="badge(category.regle).variant" class="ml-2">{{ badge(category.regle).label }}</Badge>
          </span>
          <span class="text-xs text-muted-foreground">{{ summary(category.regle) }}</span>
          <Button
            size="sm"
            variant="outline"
            :data-testid="`installment-rule-edit-${category.id}`"
            @click="toggle(category.id)"
            >{{ t("operations.installments.rule.edit") }}</Button
          >
        </div>
        <OperationsInstallmentRuleForm v-if="editing === category.id" :category="category" @done="editing = null" />
      </li>
    </ul>
  </section>
</template>
