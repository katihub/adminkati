<script setup lang="ts">
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { POINT_VENTE_LENGTHS } from "@/schemas/point-vente"

const { errors, mode, cleFollowsLibelle } = defineProps<{
  errors: Record<string, string>
  mode: "create" | "edit"
  cleFollowsLibelle: boolean
}>()

const emit = defineEmits<{ cleInput: [] }>()

const cle = defineModel<string>("cle", { required: true })
const libelle = defineModel<string>("libelle", { required: true })
const ville = defineModel<string>("ville", { required: true })
const quartier = defineModel<string>("quartier", { required: true })
const repere = defineModel<string>("repere", { required: true })

const { t } = useI18n()

function onCleInput(value: string | number) {
  cle.value = String(value)
  emit("cleInput")
}
</script>

<template>
  <fieldset class="space-y-6">
    <PointsOfSaleField
      :label="t('pointsOfSale.form.libelleLabel')"
      :hint="t('pointsOfSale.form.libelleHint')"
      :error="errors.libelle"
    >
      <template #default="{ field }">
        <Input
          v-bind="field"
          v-model="libelle"
          data-testid="points-of-sale-form-libelle"
          :placeholder="t('pointsOfSale.form.libellePlaceholder')"
        />
      </template>
    </PointsOfSaleField>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PointsOfSaleField :label="t('pointsOfSale.form.villeLabel')" :error="errors.ville">
        <template #default="{ field }">
          <Input
            v-bind="field"
            v-model="ville"
            data-testid="points-of-sale-form-ville"
            :placeholder="t('pointsOfSale.form.villePlaceholder')"
          />
        </template>
      </PointsOfSaleField>

      <PointsOfSaleField :label="t('pointsOfSale.form.quartierLabel')" :error="errors.quartier">
        <template #default="{ field }">
          <Input
            v-bind="field"
            v-model="quartier"
            data-testid="points-of-sale-form-quartier"
            :placeholder="t('pointsOfSale.form.quartierPlaceholder')"
          />
        </template>
      </PointsOfSaleField>
    </div>

    <PointsOfSaleField
      :label="t('pointsOfSale.form.cleLabel')"
      :hint="t(mode === 'create' ? 'pointsOfSale.form.cleHint' : 'pointsOfSale.form.cleLocked')"
      :error="errors.cle"
      :badge="mode === 'create' && cleFollowsLibelle ? t('pointsOfSale.form.cleFollows') : ''"
    >
      <template #default="{ field }">
        <Input
          v-bind="field"
          :model-value="cle"
          data-testid="points-of-sale-form-cle"
          class="font-mono read-only:bg-muted read-only:text-muted-foreground"
          :maxlength="POINT_VENTE_LENGTHS.cle.max"
          :readonly="mode === 'edit'"
          :aria-readonly="mode === 'edit' || undefined"
          @update:model-value="onCleInput"
        />
      </template>
    </PointsOfSaleField>

    <PointsOfSaleField
      :label="t('pointsOfSale.form.repereLabel')"
      :hint="t('pointsOfSale.form.repereHint')"
      :error="errors.repere"
    >
      <template #default="{ field }">
        <Textarea
          v-bind="field"
          v-model="repere"
          data-testid="points-of-sale-form-repere"
          :placeholder="t('pointsOfSale.form.reperePlaceholder')"
        />
      </template>
    </PointsOfSaleField>
  </fieldset>
</template>
