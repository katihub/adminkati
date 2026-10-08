<script setup lang="ts">
import type { PointVenteWizardStep } from "@/types/point-vente-wizard"
import { computed } from "vue"
import { POINT_VENTE_WIZARD_STEPS } from "@/types/point-vente-wizard"

const { current } = defineProps<{ current: PointVenteWizardStep }>()

const { t } = useI18n()
const currentIndex = computed(() => POINT_VENTE_WIZARD_STEPS.indexOf(current))
</script>

<template>
  <nav data-testid="points-of-sale-wizard-progress" :aria-label="t('pointsOfSale.drawer.wizard.progressLabel')">
    <p class="sr-only">
      {{
        t("pointsOfSale.drawer.wizard.progress", { current: currentIndex + 1, total: POINT_VENTE_WIZARD_STEPS.length })
      }}
    </p>
    <ol class="grid grid-cols-3 gap-2">
      <li v-for="(step, index) in POINT_VENTE_WIZARD_STEPS" :key="step">
        <span
          :data-testid="`points-of-sale-wizard-step-${step}`"
          :aria-current="step === current ? 'step' : undefined"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground"
          :class="index === currentIndex ? 'bg-muted font-semibold text-foreground' : ''"
        >
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            :class="index <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'"
            >{{ index + 1 }}</span
          >
          <span class="hidden min-w-0 truncate text-sm @sm:block">
            {{ t(`pointsOfSale.drawer.wizard.steps.${step}`) }}
          </span>
        </span>
      </li>
    </ol>
  </nav>
</template>
