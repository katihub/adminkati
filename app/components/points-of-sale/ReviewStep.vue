<script setup lang="ts">
import type { PointVenteFormInput } from "@/schemas/point-vente"
import { computed } from "vue"
import { Button } from "@/components/ui/button"

const { values } = defineProps<{ values: PointVenteFormInput }>()

const emit = defineEmits<{ edit: [step: "identity" | "contact-info"] }>()

const { t } = useI18n()

const phones = computed(() => values.telephones.filter(phone => phone.numero.trim() !== ""))
const coordinates = computed(() =>
  values.latitude && values.longitude ? `${values.latitude}, ${values.longitude}` : "",
)

function optional(value: string) {
  return value.trim() || t("pointsOfSale.drawer.wizard.notProvided")
}
</script>

<template>
  <div data-testid="points-of-sale-wizard-review" class="space-y-6">
    <section :aria-label="t('pointsOfSale.drawer.wizard.reviewIdentity')" class="rounded-xl border border-border p-5">
      <div class="mb-5 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="points-of-sale-wizard-review-edit-identity"
          :aria-label="`${t('pointsOfSale.drawer.wizard.edit')} ${t('pointsOfSale.drawer.wizard.reviewIdentity')}`"
          @click="emit('edit', 'identity')"
        >
          {{ t("pointsOfSale.drawer.wizard.edit") }}
        </Button>
      </div>
      <dl class="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.libelleLabel") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ values.libelle }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.cleLabel") }}
          </dt>
          <dd class="mt-1 font-mono font-medium">
            {{ values.cle }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.villeLabel") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ values.ville }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.quartierLabel") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ values.quartier }}
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.repereLabel") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ values.repere }}
          </dd>
        </div>
      </dl>
    </section>

    <section :aria-label="t('pointsOfSale.drawer.wizard.reviewContact')" class="rounded-xl border border-border p-5">
      <div class="mb-5 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="points-of-sale-wizard-review-edit-contact-info"
          :aria-label="`${t('pointsOfSale.drawer.wizard.edit')} ${t('pointsOfSale.drawer.wizard.reviewContact')}`"
          @click="emit('edit', 'contact-info')"
        >
          {{ t("pointsOfSale.drawer.wizard.edit") }}
        </Button>
      </div>
      <dl class="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.fields.telephones") }}
          </dt>
          <dd class="mt-1 space-y-1 font-medium">
            <template v-if="phones.length">
              <p v-for="phone in phones" :key="phone.numero">
                {{ phone.numero }}
                <span v-if="phone.whatsapp" class="ml-1 text-muted-foreground">{{
                  t("pointsOfSale.fields.whatsapp")
                }}</span>
              </p>
            </template>
            <span v-else>{{ t("pointsOfSale.drawer.wizard.notProvided") }}</span>
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.horairesLabel") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ optional(values.horaires) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.form.carteLabel") }}
          </dt>
          <dd class="mt-1 break-all font-medium">
            {{ optional(values.carte) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground">
            {{ t("pointsOfSale.panel.coordinates") }}
          </dt>
          <dd class="mt-1 font-medium">
            {{ optional(coordinates) }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
