<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/ui/input"
import { pointVenteSchema } from "@/schemas/point-vente"
import { mapLink, splitCoordinatePair } from "@/utils/point-of-sale"

const { errors } = defineProps<{
  errors: { carte: string; latitude: string; longitude: string }
}>()

const carte = defineModel<string>("carte", { required: true })
const latitude = defineModel<string>("latitude", { required: true })
const longitude = defineModel<string>("longitude", { required: true })

const { t } = useI18n()

/**
 * Both previews read through the form's own schema, so a link shows only for a value the save
 * would accept — and the map link opens what will be published, tracking already removed.
 */
const carteHref = computed(() => pointVenteSchema.shape.carte.safeParse(carte.value).data ?? null)
const coordinatesHref = computed(() => {
  const lat = pointVenteSchema.shape.latitude.safeParse(latitude.value).data
  const lng = pointVenteSchema.shape.longitude.safeParse(longitude.value).data
  return typeof lat === "number" && typeof lng === "number" ? mapLink(lat, lng) : null
})

/** Pasting "4.051056, 9.767868" into either half fills both — that is what Google Maps copies. */
function onPaste(event: ClipboardEvent) {
  const pair = splitCoordinatePair(event.clipboardData?.getData("text") ?? "")
  if (!pair) return
  event.preventDefault()
  ;[latitude.value, longitude.value] = pair
}
</script>

<template>
  <fieldset class="space-y-4">
    <legend class="mb-3 text-sm font-medium text-muted-foreground">
      {{ t("pointsOfSale.form.mapLegend") }}
    </legend>

    <PointsOfSaleField
      :label="t('pointsOfSale.form.carteLabel')"
      :hint="t('pointsOfSale.form.carteHint')"
      :error="errors.carte"
    >
      <template #default="{ field }">
        <Input
          v-bind="field"
          v-model="carte"
          data-testid="points-of-sale-form-carte"
          type="url"
          inputmode="url"
          autocomplete="off"
          :placeholder="t('pointsOfSale.form.cartePlaceholder')"
        />
      </template>
      <template #after>
        <a
          v-if="carteHref"
          data-testid="points-of-sale-form-carte-preview"
          :href="carteHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <Icon name="ph:map-trifold" size="14" aria-hidden="true" />
          {{ t("pointsOfSale.form.cartePreview") }}
        </a>
      </template>
    </PointsOfSaleField>

    <div class="space-y-3">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PointsOfSaleField
          :label="t('pointsOfSale.form.latitudeLabel')"
          :hint="t('pointsOfSale.form.coordinatesHint')"
          :error="errors.latitude"
        >
          <template #default="{ field }">
            <Input
              v-bind="field"
              v-model="latitude"
              data-testid="points-of-sale-form-latitude"
              inputmode="decimal"
              autocomplete="off"
              placeholder="4.051056"
              @paste="onPaste"
            />
          </template>
        </PointsOfSaleField>

        <PointsOfSaleField :label="t('pointsOfSale.form.longitudeLabel')" :error="errors.longitude">
          <template #default="{ field }">
            <Input
              v-bind="field"
              v-model="longitude"
              data-testid="points-of-sale-form-longitude"
              inputmode="decimal"
              autocomplete="off"
              placeholder="9.767868"
              @paste="onPaste"
            />
          </template>
        </PointsOfSaleField>
      </div>

      <a
        v-if="coordinatesHref"
        data-testid="points-of-sale-form-map-preview"
        :href="coordinatesHref"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        <Icon name="ph:map-pin" size="14" aria-hidden="true" />
        {{ t("pointsOfSale.form.mapPreview") }}
      </a>
    </div>
  </fieldset>
</template>
