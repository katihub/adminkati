<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTeamMutations } from "@/composables/useTeamMutations"
import { apiErrorText } from "@/utils/api-error"

const { member } = defineProps<{ member: TeamMember }>()

const { t } = useI18n()
const { updatePassword } = useTeamMutations()
const open = ref(false)
const password = ref("")
const confirmation = ref("")
const submitted = ref(false)
const errorMessage = ref("")
const success = ref(false)
const passwordError = computed(() =>
  password.value.length >= 8 && password.value.length <= 200 ? "" : t("errors.length"),
)
const confirmationError = computed(() => (confirmation.value === password.value ? "" : t("errors.match")))

watch(open, value => {
  if (!value) return
  password.value = ""
  confirmation.value = ""
  submitted.value = false
  errorMessage.value = ""
  success.value = false
})

function submit() {
  submitted.value = true
  errorMessage.value = ""
  success.value = false
  if (passwordError.value || confirmationError.value || updatePassword.isPending.value) return

  updatePassword.mutate(
    { id: member.id, input: { motDePasse: password.value } },
    {
      onSuccess: () => {
        password.value = ""
        confirmation.value = ""
        submitted.value = false
        success.value = true
      },
      onError: error => {
        errorMessage.value = apiErrorText(error, t)
      },
    },
  )
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" variant="outline" data-testid="team-password-trigger">
        <Icon name="ph:key" size="18" aria-hidden="true" />
        {{ t("trigger") }}
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t("title", { name: member.nom }) }}</DialogTitle>
        <DialogDescription>{{ t("description") }}</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" novalidate @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="team-password">{{ t("password") }}</Label>
          <Input
            id="team-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            data-testid="team-password"
          />
          <p v-if="submitted && passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
        </div>
        <div class="space-y-2">
          <Label for="team-password-confirmation">{{ t("confirmation") }}</Label>
          <Input
            id="team-password-confirmation"
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            data-testid="team-password-confirmation"
          />
        </div>
        <p v-if="submitted && confirmationError" class="text-sm text-destructive" data-testid="team-password-error">
          {{ confirmationError }}
        </p>
        <p v-if="errorMessage" class="text-sm text-destructive" role="alert">{{ errorMessage }}</p>
        <p v-if="success" class="text-sm text-primary" role="status" data-testid="team-password-success">
          {{ t("success") }}
        </p>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="updatePassword.isPending.value" @click="open = false">{{
          t("cancel")
        }}</Button>
        <Button
          type="button"
          :disabled="updatePassword.isPending.value"
          data-testid="team-password-submit"
          @click="submit"
        >
          <Spinner v-if="updatePassword.isPending.value" data-icon="inline-start" />
          {{ t("submit") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<i18n lang="json">
{
  "en": {
    "trigger": "Change password",
    "title": "Change {name}'s password",
    "description": "Choose the password this team member will use to sign in.",
    "password": "New password",
    "confirmation": "Confirm password",
    "cancel": "Cancel",
    "submit": "Update password",
    "success": "Password updated.",
    "errors": { "length": "Use between 8 and 200 characters.", "match": "The two passwords must match." }
  },
  "fr": {
    "trigger": "Modifier le mot de passe",
    "title": "Modifier le mot de passe de {name}",
    "description": "Choisissez le mot de passe que ce membre utilisera pour se connecter.",
    "password": "Nouveau mot de passe",
    "confirmation": "Confirmer le mot de passe",
    "cancel": "Annuler",
    "submit": "Enregistrer le mot de passe",
    "success": "Mot de passe modifié.",
    "errors": {
      "length": "Utilisez entre 8 et 200 caractères.",
      "match": "Les deux mots de passe doivent être identiques."
    }
  }
}
</i18n>
