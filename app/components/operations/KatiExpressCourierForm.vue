<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative form: identity, residence, sponsor and delivery neighbourhoods
import type { CourierRegistrationError } from "@/utils/courier-registration"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
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
import { usePublicLocalities, useRegisterCourier } from "@/composables/useKatiExpress"
import { apiErrorText } from "@/utils/api-error"
import {
  courierRegistrationBody,
  courierRegistrationError,
  emptyCourierRegistration,
} from "@/utils/courier-registration"

/* REGISTERING A KATI COURIER (9 November 2026). One form creates the team
   member, the courier and the invitation to choose a password. Registered by
   a focal point, the courier waits for the direction's check before carrying
   cash; the backend keeps a focal point to its shops' cities. */
const open = defineModel<boolean>("open", { required: true })
const { t } = useI18n({ useScope: "local" })
const { t: tGlobal } = useI18n()
const localities = usePublicLocalities()
const register = useRegisterCourier()
const form = ref(emptyCourierRegistration())
const otherResidence = ref(false)
const tried = ref(false)
const OTHER = "__autre__"

const cities = computed(() => localities.data.value ?? [])
const residenceDistricts = computed(
  () => cities.value.find(city => city.ville === form.value.villeResidence)?.quartiers ?? [],
)
const deliveryDistricts = computed(
  () => cities.value.find(city => city.ville === form.value.villeLivraison)?.quartiers ?? [],
)
const error = computed(() => courierRegistrationError(form.value))
const allChecked = computed(
  () => deliveryDistricts.value.length > 0 && form.value.quartiersLivraison.length === deliveryDistricts.value.length,
)

watch(open, value => {
  if (!value) return
  form.value = emptyCourierRegistration()
  otherResidence.value = false
  tried.value = false
})
watch(
  () => form.value.villeResidence,
  ville => {
    form.value.quartierResidence = ""
    otherResidence.value = false
    // The delivery city starts as the residence city; the team can change it.
    if (ville && !form.value.villeLivraison) form.value.villeLivraison = ville
  },
)
watch(
  () => form.value.villeLivraison,
  () => {
    form.value.quartiersLivraison = []
  },
)

/* The residence neighbourhood: one of the list, or « other » typed by hand. */
const residenceChoice = computed({
  get: () => (otherResidence.value ? OTHER : form.value.quartierResidence),
  set: (value: string) => {
    otherResidence.value = value === OTHER
    form.value.quartierResidence = value === OTHER ? "" : value
  },
})

function toggleDistrict(nom: string, checked: boolean) {
  const current = new Set(form.value.quartiersLivraison)
  if (checked) current.add(nom)
  else current.delete(nom)
  form.value.quartiersLivraison = deliveryDistricts.value
    .map(district => district.nom)
    .filter(name => current.has(name))
}

function toggleAll() {
  form.value.quartiersLivraison = allChecked.value ? [] : deliveryDistricts.value.map(district => district.nom)
}

const errorText = (code: CourierRegistrationError) =>
  ({
    name: t("errors.name"),
    birthDate: t("errors.birthDate"),
    minor: t("errors.minor"),
    birthPlace: t("errors.birthPlace"),
    residence: t("errors.residence"),
    email: t("errors.email"),
    phone: t("errors.phone"),
    sponsorPhone: t("errors.sponsorPhone"),
    plate: t("errors.plate"),
    districts: t("errors.districts"),
  })[code]

async function submit() {
  tried.value = true
  if (error.value) return
  try {
    const done = await register.mutateAsync(courierRegistrationBody(form.value))
    toast.success(done.aVerifier ? t("doneToCheck", { name: done.nom }) : t("done", { name: done.nom }))
    if (!done.invitationEnvoyee) toast.warning(t("noInvitation"))
    open.value = false
  } catch (cause) {
    toast.error(apiErrorText(cause, tGlobal))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-testid="courier-form">
      <DialogHeader>
        <DialogTitle>{{ t("title") }}</DialogTitle>
        <DialogDescription>{{ t("help") }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-5" novalidate @submit.prevent="submit">
        <fieldset class="grid gap-3 sm:grid-cols-2">
          <legend class="mb-2 text-sm font-semibold">{{ t("identity") }}</legend>
          <div class="grid gap-1.5 sm:col-span-2">
            <Label for="courier-name">{{ t("name") }} *</Label>
            <Input id="courier-name" v-model="form.nom" autocomplete="name" data-testid="courier-name" />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-birth-date">{{ t("birthDate") }} *</Label>
            <Input id="courier-birth-date" v-model="form.dateNaissance" type="date" data-testid="courier-birth-date" />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-birth-place">{{ t("birthPlace") }} *</Label>
            <Input id="courier-birth-place" v-model="form.lieuNaissance" data-testid="courier-birth-place" />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-email">{{ t("email") }} *</Label>
            <Input
              id="courier-email"
              v-model="form.courriel"
              type="email"
              autocomplete="email"
              data-testid="courier-email"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-phone">{{ t("phone") }} *</Label>
            <Input
              id="courier-phone"
              v-model="form.telephone"
              type="tel"
              autocomplete="tel"
              data-testid="courier-phone"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-plate">{{ t("plate") }}</Label>
            <Input
              id="courier-plate"
              v-model="form.immatriculation"
              class="uppercase"
              maxlength="20"
              :placeholder="t('plateExample')"
              data-testid="courier-plate"
            />
          </div>
        </fieldset>

        <fieldset class="grid gap-3 sm:grid-cols-2">
          <legend class="mb-2 text-sm font-semibold">{{ t("residence") }}</legend>
          <div class="grid gap-1.5">
            <Label for="courier-residence-city">{{ t("city") }} *</Label>
            <NativeSelect
              id="courier-residence-city"
              v-model="form.villeResidence"
              data-testid="courier-residence-city"
            >
              <NativeSelectOption value="">{{ t("choose") }}</NativeSelectOption>
              <NativeSelectOption v-for="city in cities" :key="city.ville" :value="city.ville">{{
                city.ville
              }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-residence-district">{{ t("district") }} *</Label>
            <NativeSelect
              id="courier-residence-district"
              v-model="residenceChoice"
              :disabled="!form.villeResidence"
              data-testid="courier-residence-district"
            >
              <NativeSelectOption value="">{{ t("choose") }}</NativeSelectOption>
              <NativeSelectOption v-for="district in residenceDistricts" :key="district.id" :value="district.nom">{{
                district.nom
              }}</NativeSelectOption>
              <NativeSelectOption :value="OTHER">{{ t("otherDistrict") }}</NativeSelectOption>
            </NativeSelect>
            <Input
              v-if="otherResidence"
              v-model="form.quartierResidence"
              :aria-label="t('district')"
              :placeholder="t('districtName')"
              data-testid="courier-residence-other"
            />
          </div>
        </fieldset>

        <fieldset class="grid gap-3 sm:grid-cols-3">
          <legend class="mb-2 text-sm font-semibold">{{ t("sponsor") }}</legend>
          <div class="grid gap-1.5">
            <Label for="courier-sponsor-name">{{ t("sponsorName") }}</Label>
            <Input id="courier-sponsor-name" v-model="form.parrainNom" data-testid="courier-sponsor-name" />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-sponsor-link">{{ t("sponsorLink") }}</Label>
            <Input id="courier-sponsor-link" v-model="form.parrainLien" :placeholder="t('sponsorLinkExample')" />
          </div>
          <div class="grid gap-1.5">
            <Label for="courier-sponsor-phone">{{ t("sponsorPhone") }}</Label>
            <Input id="courier-sponsor-phone" v-model="form.parrainTelephone" type="tel" />
          </div>
        </fieldset>

        <fieldset class="grid gap-3">
          <legend class="mb-2 text-sm font-semibold">{{ t("delivery") }}</legend>
          <div class="grid gap-1.5 sm:max-w-xs">
            <Label for="courier-delivery-city">{{ t("deliveryCity") }} *</Label>
            <NativeSelect id="courier-delivery-city" v-model="form.villeLivraison" data-testid="courier-delivery-city">
              <NativeSelectOption value="">{{ t("choose") }}</NativeSelectOption>
              <NativeSelectOption v-for="city in cities" :key="city.ville" :value="city.ville">{{
                city.ville
              }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div v-if="deliveryDistricts.length" class="grid gap-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm">{{ t("districts", { count: form.quartiersLivraison.length }) }} *</span>
              <Button type="button" size="sm" variant="ghost" @click="toggleAll">{{
                allChecked ? t("none") : t("all")
              }}</Button>
            </div>
            <div
              class="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-3"
            >
              <label
                v-for="district in deliveryDistricts"
                :key="district.id"
                class="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  :checked="form.quartiersLivraison.includes(district.nom)"
                  :data-testid="`courier-district-${district.nom}`"
                  @change="toggleDistrict(district.nom, ($event.target as HTMLInputElement).checked)"
                />
                <span class="truncate">{{ district.nom }}</span>
              </label>
            </div>
          </div>
          <p v-else-if="form.villeLivraison" class="text-sm text-muted-foreground">{{ t("noDistricts") }}</p>
        </fieldset>

        <p v-if="tried && error" class="text-sm text-destructive" role="alert" data-testid="courier-form-error">
          {{ errorText(error) }}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="register.isPending.value" @click="open = false">{{
            t("cancel")
          }}</Button>
          <Button type="submit" :disabled="register.isPending.value" data-testid="courier-submit">{{
            register.isPending.value ? t("sending") : t("submit")
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<i18n lang="json">
{
  "fr": {
    "title": "Inscrire un livreur KATI",
    "help": "Le livreur reçoit un e-mail pour choisir son mot de passe. Inscrit par un point focal, il reste « à vérifier » : pas d’espèces avant la vérification par la direction.",
    "identity": "Identité",
    "name": "Nom et prénom",
    "birthDate": "Date de naissance",
    "birthPlace": "Lieu de naissance",
    "email": "Adresse e-mail",
    "phone": "Téléphone",
    "plate": "Immatriculation du véhicule",
    "plateExample": "Ex. LT 123 AB (facultatif)",
    "residence": "Résidence",
    "city": "Ville",
    "district": "Quartier",
    "choose": "Choisissez…",
    "otherDistrict": "Autre quartier…",
    "districtName": "Nom du quartier",
    "sponsor": "Parrain (facultatif)",
    "sponsorName": "Nom du parrain",
    "sponsorLink": "Lien avec le parrain",
    "sponsorLinkExample": "Ex. oncle, ancien employeur",
    "sponsorPhone": "Téléphone du parrain",
    "delivery": "Zone de livraison",
    "deliveryCity": "Ville de livraison",
    "districts": "Aucun quartier choisi | 1 quartier choisi | {count} quartiers choisis",
    "all": "Tout cocher",
    "none": "Tout décocher",
    "noDistricts": "Aucun quartier n’est encore listé pour cette ville : ajoutez-en dans Localités.",
    "cancel": "Annuler",
    "submit": "Inscrire le livreur",
    "sending": "Inscription…",
    "done": "{name} est inscrit et vérifié. Son invitation est partie.",
    "doneToCheck": "{name} est inscrit, à vérifier par la direction. Son invitation est partie.",
    "noInvitation": "L’e-mail d’invitation n’est pas parti : renvoyez-le depuis Équipe.",
    "errors": {
      "name": "Indiquez le nom et le prénom.",
      "birthDate": "Indiquez la date de naissance.",
      "minor": "Le livreur doit avoir au moins 18 ans.",
      "birthPlace": "Indiquez le lieu de naissance.",
      "residence": "Indiquez la ville et le quartier de résidence.",
      "email": "Indiquez une adresse e-mail valide.",
      "phone": "Indiquez un numéro de téléphone valide.",
      "sponsorPhone": "Le numéro du parrain n’est pas valide.",
      "plate": "L’immatriculation n’est pas valide : lettres, chiffres, espaces ou tirets.",
      "districts": "Choisissez la ville et au moins un quartier de livraison."
    }
  },
  "en": {
    "title": "Register a KATI courier",
    "help": "The courier receives an e-mail to choose a password. Registered by a focal point, they stay « to check »: no cash before the direction checks them.",
    "identity": "Identity",
    "name": "Full name",
    "birthDate": "Date of birth",
    "birthPlace": "Place of birth",
    "email": "E-mail address",
    "phone": "Phone",
    "plate": "Vehicle plate",
    "plateExample": "E.g. LT 123 AB (optional)",
    "residence": "Residence",
    "city": "City",
    "district": "Neighbourhood",
    "choose": "Choose…",
    "otherDistrict": "Other neighbourhood…",
    "districtName": "Neighbourhood name",
    "sponsor": "Sponsor (optional)",
    "sponsorName": "Sponsor's name",
    "sponsorLink": "Relationship to the sponsor",
    "sponsorLinkExample": "E.g. uncle, former employer",
    "sponsorPhone": "Sponsor's phone",
    "delivery": "Delivery area",
    "deliveryCity": "Delivery city",
    "districts": "No neighbourhood chosen | 1 neighbourhood chosen | {count} neighbourhoods chosen",
    "all": "Check all",
    "none": "Uncheck all",
    "noDistricts": "No neighbourhood is listed for this city yet: add some in Localities.",
    "cancel": "Cancel",
    "submit": "Register the courier",
    "sending": "Registering…",
    "done": "{name} is registered and checked. The invitation has been sent.",
    "doneToCheck": "{name} is registered, to be checked by the direction. The invitation has been sent.",
    "noInvitation": "The invitation e-mail did not go out: resend it from Team.",
    "errors": {
      "name": "Enter the full name.",
      "birthDate": "Enter the date of birth.",
      "minor": "The courier must be at least 18.",
      "birthPlace": "Enter the place of birth.",
      "residence": "Enter the city and neighbourhood of residence.",
      "email": "Enter a valid e-mail address.",
      "phone": "Enter a valid phone number.",
      "sponsorPhone": "The sponsor's number is not valid.",
      "plate": "The plate is not valid: letters, digits, spaces or dashes.",
      "districts": "Choose the city and at least one delivery neighbourhood."
    }
  }
}
</i18n>
