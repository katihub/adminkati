<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMarketplacePilotMutations, useMarketplacePilotReferences } from "@/composables/useMarketplacePilots"
import { DEFAULT_PILOT_POLICY, percentToBps } from "@/utils/pilot-measures"

const emit = defineEmits<{ created: [id: string] }>()
const { t } = useI18n()
const references = useMarketplacePilotReferences()
const { create } = useMarketplacePilotMutations()

const form = reactive({
  nom: "",
  villeId: "",
  plafondCommandesJournalier: 50,
  joursObservationMinimum: DEFAULT_PILOT_POLICY.joursObservationMinimum,
  commandesLivreesMinimum: DEFAULT_PILOT_POLICY.commandesLivreesMinimum,
  tauxLivraison: String(DEFAULT_PILOT_POLICY.tauxLivraisonMinimumBps / 100),
  tauxAnnulation: String(DEFAULT_PILOT_POLICY.tauxAnnulationMaximumBps / 100),
  tauxLitige: String(DEFAULT_PILOT_POLICY.tauxLitigeMaximumBps / 100),
  tempsRapprochementMaximumMinutes: DEFAULT_PILOT_POLICY.tempsRapprochementMaximumMinutes,
  backlogSupportMaximum: DEFAULT_PILOT_POLICY.backlogSupportMaximum,
})
const selectedShops = ref<string[]>([])
const shopFilter = ref("")

const selectedCity = computed(() => references.data.value?.villes.find(ville => ville.id === form.villeId))
const shops = computed(() => {
  const query = shopFilter.value.trim().toLocaleLowerCase()
  return (references.data.value?.boutiques ?? []).filter(
    shop => !query || `${shop.nom} ${shop.vendeur}`.toLocaleLowerCase().includes(query),
  )
})
const rates = computed(() => ({
  livraison: percentToBps(form.tauxLivraison),
  annulation: percentToBps(form.tauxAnnulation),
  litige: percentToBps(form.tauxLitige),
}))
const canSubmit = computed(
  () =>
    form.nom.trim().length >= 3 &&
    Boolean(form.villeId) &&
    selectedShops.value.length > 0 &&
    rates.value.livraison !== null &&
    rates.value.annulation !== null &&
    rates.value.litige !== null,
)

function submit() {
  if (!canSubmit.value) return
  create.mutate(
    {
      villeId: form.villeId,
      nom: form.nom.trim(),
      plafondCommandesJournalier: Number(form.plafondCommandesJournalier),
      boutiqueIds: selectedShops.value,
      politique: {
        joursObservationMinimum: Number(form.joursObservationMinimum),
        commandesLivreesMinimum: Number(form.commandesLivreesMinimum),
        tauxLivraisonMinimumBps: rates.value.livraison!,
        tauxAnnulationMaximumBps: rates.value.annulation!,
        tauxLitigeMaximumBps: rates.value.litige!,
        tempsRapprochementMaximumMinutes: Number(form.tempsRapprochementMaximumMinutes),
        backlogSupportMaximum: Number(form.backlogSupportMaximum),
      },
    },
    {
      onSuccess: pilot => {
        form.nom = ""
        selectedShops.value = []
        emit("created", pilot.id)
      },
    },
  )
}
</script>

<template>
  <aside
    class="h-fit rounded-xl border bg-card p-5 shadow-sm xl:sticky xl:top-4"
    data-testid="marketplace-pilot-create-form"
  >
    <h2 class="font-heading text-lg font-semibold">{{ t("operations.pilot.create.title") }}</h2>
    <p class="mt-1 text-xs text-muted-foreground">{{ t("operations.pilot.create.hint") }}</p>
    <ApiErrorCard
      v-if="references.error.value"
      class="mt-4"
      :error="references.error.value"
      @retry="() => void references.refetch()"
    />
    <form class="mt-5 space-y-4" @submit.prevent="submit">
      <label class="block text-sm font-medium"
        >{{ t("operations.pilot.create.name") }}<Input v-model="form.nom" class="mt-1.5" maxlength="160" required
      /></label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium"
          >{{ t("operations.pilot.create.city")
          }}<select
            v-model="form.villeId"
            class="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="" disabled>{{ t("operations.pilot.create.chooseCity") }}</option>
            <option v-for="ville in references.data.value?.villes ?? []" :key="ville.id" :value="ville.id">
              {{ ville.nom }}
            </option>
          </select></label
        ><label class="block text-sm font-medium"
          >{{ t("operations.pilot.create.dailyCap")
          }}<Input v-model.number="form.plafondCommandesJournalier" type="number" min="1" class="mt-1.5" required
        /></label>
      </div>
      <p v-if="selectedCity && selectedCity.statut !== 'pilote'" class="text-xs text-amber-700">
        {{ t("operations.pilot.create.cityStatus", { status: selectedCity.statut }) }}
      </p>

      <fieldset class="rounded-lg border p-3">
        <legend class="px-1 text-xs font-semibold">
          {{ t("operations.pilot.create.shops", { count: selectedShops.length }) }}
        </legend>
        <Input v-model="shopFilter" class="mt-1" :placeholder="t('operations.pilot.create.searchShops')" />
        <div class="mt-2 max-h-48 space-y-1 overflow-y-auto">
          <label
            v-for="shop in shops"
            :key="shop.id"
            class="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted"
          >
            <input v-model="selectedShops" type="checkbox" :value="shop.id" class="size-4" />
            <span class="min-w-0 flex-1 truncate">{{ shop.nom }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ shop.villesLivraison.join(", ") }}</span>
          </label>
          <p v-if="!shops.length" class="px-2 py-3 text-xs text-muted-foreground">
            {{ t("operations.pilot.create.noShop") }}
          </p>
        </div>
      </fieldset>

      <fieldset class="rounded-lg border p-3">
        <legend class="px-1 text-xs font-semibold">{{ t("operations.pilot.create.policy") }}</legend>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.indicators.observedDays")
            }}<Input v-model.number="form.joursObservationMinimum" type="number" min="1" class="mt-1"
          /></label>
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.indicators.deliveredOrders")
            }}<Input v-model.number="form.commandesLivreesMinimum" type="number" min="1" class="mt-1"
          /></label>
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.create.minDeliveryRate")
            }}<Input v-model="form.tauxLivraison" inputmode="decimal" class="mt-1"
          /></label>
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.create.maxCancellationRate")
            }}<Input v-model="form.tauxAnnulation" inputmode="decimal" class="mt-1"
          /></label>
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.create.maxDisputeRate")
            }}<Input v-model="form.tauxLitige" inputmode="decimal" class="mt-1"
          /></label>
          <label class="block text-xs font-medium"
            >{{ t("operations.pilot.create.maxReconciliation")
            }}<Input v-model.number="form.tempsRapprochementMaximumMinutes" type="number" min="1" class="mt-1"
          /></label>
          <label class="col-span-2 block text-xs font-medium"
            >{{ t("operations.pilot.create.maxBacklog")
            }}<Input v-model.number="form.backlogSupportMaximum" type="number" min="0" class="mt-1"
          /></label>
        </div>
      </fieldset>

      <p v-if="create.error.value" class="text-sm text-destructive" role="alert">
        {{ t("operations.pilot.create.error") }}
      </p>
      <Button
        type="submit"
        class="w-full"
        :disabled="!canSubmit || create.isPending.value"
        data-testid="marketplace-pilot-create-submit"
        ><Icon name="ph:flag-banner" />{{
          create.isPending.value ? t("operations.pilot.create.saving") : t("operations.pilot.create.submit")
        }}</Button
      >
    </form>
  </aside>
</template>
