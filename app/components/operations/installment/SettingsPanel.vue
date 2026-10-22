<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInstallmentMutations, useInstallmentSettings } from "@/composables/useInstallmentPlans"
import { useToastAction } from "@/composables/useToastAction"

const { t } = useI18n()
const { settings } = useInstallmentSettings()
const { updateSettings } = useInstallmentMutations()
const run = useToastAction()
const general = reactive({ active: false, maxPlans: 3 })
const maxPlansError = computed(() =>
  Number.isInteger(general.maxPlans) && general.maxPlans >= 1 && general.maxPlans <= 20
    ? ""
    : t("operations.installments.maxPlansInvalid"),
)

watch(
  () => settings.data.value,
  value => {
    if (value) Object.assign(general, { active: value.actif, maxPlans: value.plansOuvertsMaxParClient })
  },
  { immediate: true },
)

function save() {
  if (maxPlansError.value) return
  void run(
    () => updateSettings.mutateAsync({ actif: general.active, plansOuvertsMaxParClient: general.maxPlans }),
    t("operations.installments.settingsSaved"),
  )
}
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-5">
    <h3 class="font-heading font-semibold">{{ t("operations.installments.settingsTitle") }}</h3>
    <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{{ t("operations.installments.settingsHelp") }}</p>
    <div v-if="settings.isPending.value" class="mt-4 h-16 animate-pulse rounded-lg bg-muted" />
    <ApiErrorCard v-else-if="settings.error.value" :error="settings.error.value" @retry="settings.refetch()" />
    <form v-else class="mt-4 flex flex-wrap items-end gap-4" @submit.prevent="save">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="general.active" type="checkbox" class="size-4" data-testid="installments-active" />
        {{ t("operations.installments.active") }}
      </label>
      <div class="grid gap-1.5">
        <Label for="installments-max-plans">{{ t("operations.installments.maxPlans") }}</Label>
        <Input
          id="installments-max-plans"
          v-model.number="general.maxPlans"
          type="number"
          min="1"
          max="20"
          class="w-28"
          data-testid="installments-max-plans"
        />
      </div>
      <Button
        type="submit"
        :disabled="updateSettings.isPending.value || Boolean(maxPlansError)"
        data-testid="installments-save-settings"
        >{{ t("operations.installments.save") }}</Button
      >
      <p v-if="maxPlansError" class="w-full text-xs text-destructive" role="alert">{{ maxPlansError }}</p>
    </form>
  </section>
</template>
