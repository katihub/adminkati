<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { useTeamMutations } from "@/composables/useTeamMutations"
import { apiErrorText } from "@/utils/api-error"

/** Sends the « Choisir mon mot de passe » link again to an active member who never signed in. */
const { member } = defineProps<{ member: TeamMember }>()
const { t } = useI18n({ useScope: "local" })
const { resendInvitation } = useTeamMutations()

async function resend() {
  try {
    const result = await resendInvitation.mutateAsync(member.id)
    if (result.invitationEnvoyee) toast.success(t("sent", { email: member.courriel }))
    else toast.error(t("notSent"))
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <Button
    variant="outline"
    :disabled="resendInvitation.isPending.value"
    data-testid="team-resend-invitation"
    @click="resend"
    ><Icon name="ph:paper-plane-tilt" /> {{ t("resend") }}</Button
  >
</template>

<i18n lang="json">
{
  "en": {
    "resend": "Resend the invitation",
    "sent": "Invitation sent to {email}.",
    "notSent": "The invitation could not be sent. Check the e-mail settings, or tell the member yourself."
  },
  "fr": {
    "resend": "Renvoyer l’invitation",
    "sent": "Invitation envoyée à {email}.",
    "notSent": "L’invitation n’a pas pu partir. Vérifiez les réglages d’envoi d’e-mail, ou prévenez le membre vous-même."
  }
}
</i18n>
