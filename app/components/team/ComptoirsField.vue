<script setup lang="ts">
import type { Comptoir } from "@/types/api/vitrine"

const {
  comptoirs,
  disabled = false,
  testIdPrefix,
} = defineProps<{
  comptoirs: Comptoir[]
  disabled?: boolean
  /** `team-hire` or `team-member`: the two dialogs that carry this field. */
  testIdPrefix: string
}>()

const selected = defineModel<string[]>({ required: true })

const { t } = useI18n()

function toggle(cle: string) {
  if (disabled) return
  selected.value = selected.value.includes(cle)
    ? selected.value.filter(existing => existing !== cle)
    : [...selected.value, cle]
}
</script>

<template>
  <fieldset class="space-y-2" :data-testid="`${testIdPrefix}-comptoirs`">
    <legend class="text-sm font-medium">
      {{ t("team.comptoirs.label") }}
    </legend>

    <div v-if="comptoirs.length > 0" class="flex flex-col gap-1.5">
      <label
        v-for="comptoir in comptoirs"
        :key="comptoir.cle"
        class="flex cursor-pointer items-center gap-2 text-sm text-foreground"
      >
        <input
          type="checkbox"
          class="size-4 shrink-0 accent-primary"
          :data-testid="`${testIdPrefix}-comptoir`"
          :data-comptoir="comptoir.cle"
          :value="comptoir.cle"
          :checked="selected.includes(comptoir.cle)"
          :disabled="disabled"
          @change="toggle(comptoir.cle)"
        />
        <span class="min-w-0 truncate">{{ comptoir.libelle }}</span>
      </label>
    </div>
    <p v-else class="text-xs text-muted-foreground" :data-testid="`${testIdPrefix}-comptoirs-none`">
      {{ t("team.comptoirs.nonePublished") }}
    </p>

    <!--
      LA LISTE VIDE VEUT DIRE « TOUTE LA BOUTIQUE », ET PERSONNE NE LE DEVINE.
      Le backend n'en restreint le périmètre qu'à partir d'un comptoir coché ;
      zéro case cochée ouvre tout. La phrase est permanente, pas une infobulle :
      elle se lit avant qu'on décoche, pas seulement après.
    -->
    <p class="text-xs text-muted-foreground" :data-testid="`${testIdPrefix}-comptoirs-hint`">
      {{ t("team.comptoirs.emptyMeaning") }}
    </p>
  </fieldset>
</template>
