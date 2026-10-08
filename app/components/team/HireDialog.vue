<script setup lang="ts">
import type { HireTeamMemberInput, HireTeamMemberResult, TeamRole } from "@/types/api/equipe"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useComptoirs } from "@/composables/usePointsVente"
import { useTeamMutations } from "@/composables/useTeamMutations"
import { isTeamPhoneValid } from "@/composables/useTeamPhone"
import { apiErrorText } from "@/utils/api-error"

const emit = defineEmits<{
  hired: [member: HireTeamMemberResult]
  open: [id: string]
}>()

const { t } = useI18n()
const { hire } = useTeamMutations()
const { comptoirs } = useComptoirs()

/**
 * Le même filet que `@IsEmail()`, en plus grossier : un arbitrage, pas une
 * deuxième vérité. Les classes excluent le `@` et le `.` de part et d'autre
 * pour qu'aucune coupure ne soit ambiguë — un motif plus permissif rétrograde
 * en temps quadratique sur une saisie longue sans arobase.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

const open = ref(false)
const courriel = ref("")
const nom = ref("")
const telephone = ref("")
const selectedComptoirs = ref<string[]>([])
const roles = ref<TeamRole[]>([])
const submitted = ref(false)
const errorMessage = ref("")
const result = ref<HireTeamMemberResult | null>(null)

const pending = computed(() => hire.isPending.value)
const isResultStep = computed(() => result.value !== null)

const courrielError = computed(() => (EMAIL_PATTERN.test(courriel.value.trim()) ? "" : t("team.hire.errors.email")))
const nomError = computed(() => {
  const length = nom.value.trim().length
  return length >= 2 && length <= 80 ? "" : t("team.hire.errors.name")
})
const rolesError = computed(() => (roles.value.length > 0 ? "" : t("team.hire.errors.roles")))
const telephoneError = computed(() => (isTeamPhoneValid(telephone.value) ? "" : t("team.hire.errors.phone")))
const isValid = computed(() => !courrielError.value && !nomError.value && !rolesError.value && !telephoneError.value)

function reset() {
  courriel.value = ""
  nom.value = ""
  telephone.value = ""
  selectedComptoirs.value = []
  roles.value = []
  submitted.value = false
  errorMessage.value = ""
  result.value = null
}

watch(open, isOpen => {
  if (isOpen) reset()
})

function submit() {
  submitted.value = true
  errorMessage.value = ""
  if (!isValid.value || pending.value) return

  const phone = telephone.value.trim()
  // Une liste vide vaut « toute la boutique » : ne rien envoyer dit la même
  // chose et laisse le backend garder son propre défaut.
  const input: HireTeamMemberInput = {
    courriel: courriel.value.trim().toLowerCase(),
    nom: nom.value.trim(),
    roles: [...roles.value],
    ...(phone ? { telephone: phone } : {}),
    ...(selectedComptoirs.value.length > 0 ? { comptoirs: [...selectedComptoirs.value] } : {}),
  }

  hire.mutate(input, {
    onSuccess: member => {
      result.value = member
      emit("hired", member)
    },
    onError: (error: unknown) => {
      errorMessage.value = apiErrorText(error, t)
    },
  })
}

function openRecord() {
  const member = result.value
  open.value = false
  if (member) emit("open", member.id)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" data-testid="team-hire-trigger">
        <Icon name="ph:user-plus" size="18" aria-hidden="true" />
        {{ t("team.hire.trigger") }}
      </Button>
    </DialogTrigger>

    <DialogContent data-testid="team-hire-dialog" class="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isResultStep ? t("team.hire.result.heading") : t("team.hire.title") }}</DialogTitle>
        <DialogDescription>
          {{ isResultStep ? t("team.hire.result.description") : t("team.hire.description") }}
        </DialogDescription>
      </DialogHeader>

      <TeamHireResult v-if="isResultStep && result" key="result" :result="result" />

      <TeamHireForm
        v-else
        key="form"
        v-model:courriel="courriel"
        v-model:nom="nom"
        v-model:telephone="telephone"
        v-model:roles="roles"
        v-model:selected-comptoirs="selectedComptoirs"
        :comptoirs="comptoirs"
        :pending="pending"
        :submitted="submitted"
        :error-message="errorMessage"
        :courriel-error="courrielError"
        :nom-error="nomError"
        :roles-error="rolesError"
        :telephone-error="telephoneError"
        @submit="submit"
      />

      <DialogFooter>
        <template v-if="isResultStep">
          <Button type="button" variant="outline" data-testid="team-hire-close" @click="open = false">
            {{ t("team.hire.close") }}
          </Button>
          <Button type="button" data-testid="team-hire-open-record" @click="openRecord">
            {{ t("team.hire.openRecord") }}
          </Button>
        </template>
        <template v-else>
          <Button
            type="button"
            variant="outline"
            :disabled="pending"
            data-testid="team-hire-cancel"
            @click="open = false"
          >
            {{ t("team.hire.cancel") }}
          </Button>
          <Button
            type="button"
            data-testid="team-hire-submit"
            :disabled="pending"
            :aria-busy="pending ? true : undefined"
            @click="submit"
          >
            <Spinner v-if="pending" data-icon="inline-start" />
            {{ pending ? t("team.hire.submitting") : t("team.hire.submit") }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
