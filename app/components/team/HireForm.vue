<script setup lang="ts">
import type { TeamRole } from "@/types/api/equipe"
import type { Comptoir } from "@/types/api/vitrine"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TEAM_PHONE_PLACEHOLDER } from "@/composables/useTeamPhone"

const { comptoirs, pending, submitted, errorMessage, courrielError, nomError, rolesError, telephoneError } =
  defineProps<{
    comptoirs: Comptoir[]
    pending: boolean
    submitted: boolean
    errorMessage: string
    courrielError: string
    nomError: string
    rolesError: string
    telephoneError: string
  }>()
const emit = defineEmits<{
  submit: []
}>()
const courriel = defineModel<string>("courriel", { required: true })
const nom = defineModel<string>("nom", { required: true })
const telephone = defineModel<string>("telephone", { required: true })
const roles = defineModel<TeamRole[]>("roles", { required: true })
const selectedComptoirs = defineModel<string[]>("selectedComptoirs", { required: true })

const { t } = useI18n()

const TEAM_ROLES: TeamRole[] = ["direction", "comptoir", "preparation", "livreur"]

/** Les messages ne s'affichent qu'après une tentative : un formulaire vide n'est pas une faute. */
function fieldError(message: string) {
  return submitted && message ? message : ""
}

function toggleRole(role: TeamRole) {
  if (pending) return
  roles.value = roles.value.includes(role) ? roles.value.filter(existing => existing !== role) : [...roles.value, role]
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="emit('submit')">
    <div class="space-y-2">
      <Label for="team-hire-email">{{ t("team.hire.email") }}</Label>
      <Input
        id="team-hire-email"
        :model-value="courriel"
        data-testid="team-hire-email"
        type="email"
        autocomplete="off"
        :placeholder="t('team.hire.emailPlaceholder')"
        :disabled="pending"
        :aria-invalid="fieldError(courrielError) ? true : undefined"
        @update:model-value="courriel = String($event)"
      />
      <p v-if="fieldError(courrielError)" class="text-xs text-destructive" data-testid="team-hire-email-error">
        {{ courrielError }}
      </p>
    </div>

    <div class="space-y-2">
      <Label for="team-hire-name">{{ t("team.hire.name") }}</Label>
      <Input
        id="team-hire-name"
        :model-value="nom"
        data-testid="team-hire-name"
        type="text"
        maxlength="80"
        :placeholder="t('team.hire.namePlaceholder')"
        :disabled="pending"
        :aria-invalid="fieldError(nomError) ? true : undefined"
        @update:model-value="nom = String($event)"
      />
      <p v-if="fieldError(nomError)" class="text-xs text-destructive" data-testid="team-hire-name-error">
        {{ nomError }}
      </p>
    </div>

    <fieldset class="space-y-2" data-testid="team-hire-roles">
      <legend class="text-sm font-medium">
        {{ t("team.hire.roles") }}
      </legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="role in TEAM_ROLES"
          :key="role"
          type="button"
          data-testid="team-hire-role"
          :data-role="role"
          :aria-pressed="roles.includes(role) ? 'true' : 'false'"
          :disabled="pending"
          class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
          :class="
            roles.includes(role)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/80 bg-card text-foreground hover:border-foreground/50'
          "
          @click="toggleRole(role)"
        >
          {{ t(`team.roles.${role}`) }}
        </button>
      </div>
      <p v-if="fieldError(rolesError)" class="text-xs text-destructive" data-testid="team-hire-roles-error">
        {{ rolesError }}
      </p>
    </fieldset>

    <div class="space-y-2">
      <Label for="team-hire-phone">{{ t("team.hire.phone") }}</Label>
      <Input
        id="team-hire-phone"
        :model-value="telephone"
        data-testid="team-hire-phone"
        type="tel"
        inputmode="tel"
        :placeholder="TEAM_PHONE_PLACEHOLDER"
        :disabled="pending"
        aria-describedby="team-hire-phone-hint"
        :aria-invalid="fieldError(telephoneError) ? true : undefined"
        @update:model-value="telephone = String($event)"
      />
      <p id="team-hire-phone-hint" class="text-xs text-muted-foreground" data-testid="team-hire-phone-hint">
        {{ t("team.hire.phoneHint") }}
      </p>
      <p v-if="fieldError(telephoneError)" class="text-xs text-destructive" data-testid="team-hire-phone-error">
        {{ telephoneError }}
      </p>
    </div>

    <TeamComptoirsField
      v-model="selectedComptoirs"
      :comptoirs="comptoirs"
      :disabled="pending"
      test-id-prefix="team-hire"
    />

    <p v-if="errorMessage" role="alert" class="text-sm text-destructive" data-testid="team-hire-error">
      {{ errorMessage }}
    </p>
  </form>
</template>
