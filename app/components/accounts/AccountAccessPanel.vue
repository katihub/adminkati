<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative panel: account state, four actions and their dialog
import type { AccountAction, AccountActionResult } from "@/types/api/accounts"
import { computed, ref } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAccountAction, useAccountDetail } from "@/composables/useAccounts"
import { accountActionNeedsReason, accountKinds, visibleAccountActions } from "@/utils/account-access"
import { apiErrorText } from "@/utils/api-error"

/* HELPING SOMEONE BACK INTO THEIR ACCOUNT (9 November 2026). Shown on the
   accounts page, on a customer's record and on each shop member. The backend
   decides what the caller may do; a copied link or a temporary password is
   shown once and never stored. */
const { email } = defineProps<{ email: string }>()
const { t, locale } = useI18n({ useScope: "local" })
const { t: tGlobal } = useI18n()
const detail = useAccountDetail(() => email)
const mutation = useAccountAction()
const chosen = ref<AccountAction | null>(null)
const reason = ref("")
const result = ref<AccountActionResult | null>(null)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }))
const account = computed(() => detail.data.value)
const actions = computed(() => (account.value ? visibleAccountActions(account.value) : []))
const needsReason = computed(() => (chosen.value ? accountActionNeedsReason(chosen.value) : false))
const reasonValid = computed(() => !needsReason.value || reason.value.trim().length >= 5)
const secret = computed(() => result.value?.lien ?? result.value?.motDePasse ?? null)
/* Explicit keys: the translation check reads every label. */
const kindLabel = (kind: "client" | "seller") => (kind === "client" ? t("kind.client") : t("kind.seller"))
const actionLabel = (action: AccountAction) =>
  ({
    creer_acces: t("actions.creer_acces"),
    lien: t("actions.lien"),
    confirmer: t("actions.confirmer"),
    lien_a_transmettre: t("actions.lien_a_transmettre"),
    temporaire: t("actions.temporaire"),
  })[action]
const actionHelp = (action: AccountAction) =>
  ({
    creer_acces: t("help.creer_acces", { email }),
    lien: t("help.lien", { email }),
    confirmer: t("help.confirmer", { email }),
    lien_a_transmettre: t("help.lien_a_transmettre", { email }),
    temporaire: t("help.temporaire", { email }),
  })[action]
const doneLabel = (done: AccountActionResult) =>
  done.dejaConfirme
    ? t("done.alreadyConfirmed")
    : done.action === "creer_acces"
      ? t("done.creer_acces")
      : done.action === "confirmer"
        ? t("done.confirmer")
        : t("done.lien")

function open(action: AccountAction) {
  chosen.value = action
  reason.value = ""
  result.value = null
}

function close() {
  chosen.value = null
  result.value = null
}

async function confirm() {
  if (!chosen.value || !reasonValid.value) return
  try {
    const done = await mutation.mutateAsync({
      courriel: email,
      action: chosen.value,
      motif: needsReason.value ? reason.value.trim() : undefined,
    })
    if (done.lien || done.motDePasse) {
      result.value = done
      return
    }
    toast.success(doneLabel(done))
    close()
  } catch (cause) {
    toast.error(apiErrorText(cause, tGlobal))
  }
}

async function copy() {
  if (!secret.value) return
  try {
    await navigator.clipboard.writeText(secret.value)
    toast.success(t("copied"))
  } catch {
    toast.error(t("copyFailed"))
  }
}
</script>

<template>
  <section class="grid gap-3 rounded-xl border border-border bg-card p-4" data-testid="account-access-panel">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-heading text-sm font-semibold">{{ t("title") }}</h3>
      <div class="flex flex-wrap gap-1">
        <Badge v-for="kind in account ? accountKinds(account) : []" :key="kind" variant="secondary">{{
          kindLabel(kind)
        }}</Badge>
      </div>
    </header>

    <p v-if="detail.isPending.value" class="text-sm text-muted-foreground">{{ t("loading") }}</p>
    <p v-else-if="detail.error.value" class="text-sm text-destructive" role="alert">
      {{ apiErrorText(detail.error.value, tGlobal) }}
    </p>
    <template v-else-if="account">
      <p v-if="!account.auth" class="text-sm text-muted-foreground" data-testid="account-no-login">
        {{ t("noLogin") }}
      </p>
      <dl v-else class="grid gap-1 text-sm">
        <div class="flex flex-wrap gap-x-2">
          <dt class="text-muted-foreground">{{ t("email") }}</dt>
          <dd class="font-medium" :class="account.auth.courrielConfirme ? '' : 'text-destructive'">
            {{ account.auth.courrielConfirme ? t("confirmed") : t("notConfirmed") }}
          </dd>
        </div>
        <div class="flex flex-wrap gap-x-2">
          <dt class="text-muted-foreground">{{ t("lastLogin") }}</dt>
          <dd class="font-medium">
            {{ account.auth.derniereConnexion ? date.format(new Date(account.auth.derniereConnexion)) : t("never") }}
          </dd>
        </div>
        <div v-if="account.auth.banni" class="text-destructive">{{ t("banned") }}</div>
      </dl>
      <p v-if="account.boutiques.length" class="text-xs text-muted-foreground">
        {{ t("shops", { shops: account.boutiques.map(shop => shop.nom).join(", ") }) }}
      </p>
      <div v-if="actions.length" class="flex flex-wrap gap-1">
        <Button
          v-for="action in actions"
          :key="action"
          size="sm"
          :variant="action === 'lien' || action === 'creer_acces' ? 'default' : 'outline'"
          :class="action === 'temporaire' ? 'text-destructive' : undefined"
          :data-testid="`account-action-${action}`"
          @click="open(action)"
          >{{ actionLabel(action) }}</Button
        >
      </div>
    </template>

    <Dialog :open="Boolean(chosen)" @update:open="value => (value ? null : close())">
      <DialogContent data-testid="account-action-dialog">
        <DialogHeader>
          <DialogTitle>{{ chosen ? actionLabel(chosen) : "" }}</DialogTitle>
          <DialogDescription>{{ chosen ? actionHelp(chosen) : "" }}</DialogDescription>
        </DialogHeader>
        <div v-if="secret" class="grid gap-2" data-testid="account-action-secret">
          <p class="text-sm font-medium">{{ result?.lien ? t("linkReady") : t("passwordReady") }}</p>
          <code class="block break-all rounded-md border border-border bg-muted p-3 text-sm select-all">{{
            secret
          }}</code>
          <p class="text-xs text-muted-foreground">{{ t("shownOnce") }}</p>
          <DialogFooter>
            <Button variant="outline" @click="copy">{{ t("copy") }}</Button>
            <Button @click="close">{{ t("close") }}</Button>
          </DialogFooter>
        </div>
        <form v-else class="grid gap-4" @submit.prevent="confirm">
          <div v-if="needsReason" class="grid gap-2">
            <Label for="account-action-reason">{{ t("reason") }}</Label>
            <Textarea
              id="account-action-reason"
              v-model="reason"
              rows="3"
              maxlength="500"
              data-testid="account-action-reason"
            />
            <p class="text-xs text-muted-foreground">{{ t("reasonHelp") }}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" :disabled="mutation.isPending.value" @click="close">{{
              t("cancel")
            }}</Button>
            <Button
              type="submit"
              :disabled="mutation.isPending.value || !reasonValid"
              data-testid="account-action-confirm"
              >{{ t("confirm") }}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
</template>

<i18n lang="json">
{
  "fr": {
    "title": "Accès au compte",
    "loading": "Chargement du compte…",
    "kind": { "client": "Client", "seller": "Vendeur" },
    "noLogin": "Aucun compte de connexion pour cette adresse. Si la création a échoué à l’inscription, créez l’accès : la personne recevra un e-mail pour choisir son mot de passe.",
    "email": "E-mail :",
    "confirmed": "confirmé",
    "notConfirmed": "non confirmé",
    "lastLogin": "Dernière connexion :",
    "never": "jamais",
    "banned": "Compte bloqué.",
    "shops": "Boutiques : {shops}",
    "actions": {
      "creer_acces": "Créer l’accès",
      "lien": "Envoyer un lien de réinitialisation",
      "confirmer": "Confirmer l’e-mail",
      "lien_a_transmettre": "Copier un lien à transmettre",
      "temporaire": "Mot de passe temporaire"
    },
    "help": {
      "creer_acces": "Le compte de connexion de {email} sera créé, e-mail déjà confirmé, et la personne recevra un e-mail KatiMarket pour choisir son mot de passe (lien valable une heure). Elle retrouvera sa boutique en se connectant.",
      "lien": "Un e-mail KatiMarket part vers {email}, avec un lien valable une heure. La personne choisit elle-même son mot de passe.",
      "confirmer": "L’adresse {email} sera marquée confirmée : la personne pourra se connecter sans l’e-mail de confirmation. Elle en sera prévenue.",
      "lien_a_transmettre": "Un lien de réinitialisation pour {email} s’affichera une seule fois, à transmettre par WhatsApp ou SMS. Valable une heure, un seul usage. La personne en sera prévenue par e-mail.",
      "temporaire": "Un mot de passe sera généré pour {email} et affiché une seule fois. À sa prochaine connexion, la personne devra en choisir un nouveau. Elle en sera prévenue par e-mail."
    },
    "reason": "Motif",
    "reasonHelp": "5 caractères au moins. Il est inscrit au journal.",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "linkReady": "Lien à transmettre :",
    "passwordReady": "Mot de passe temporaire :",
    "shownOnce": "Il ne sera plus affiché : copiez-le maintenant.",
    "copy": "Copier",
    "copied": "Copié",
    "copyFailed": "Copie impossible : sélectionnez le texte.",
    "close": "Fermer",
    "done": {
      "creer_acces": "Accès créé : l’e-mail pour choisir le mot de passe est parti",
      "lien": "Lien de réinitialisation envoyé par e-mail",
      "confirmer": "E-mail confirmé : la personne peut se connecter",
      "alreadyConfirmed": "Cet e-mail était déjà confirmé"
    }
  },
  "en": {
    "title": "Account access",
    "loading": "Loading the account…",
    "kind": { "client": "Customer", "seller": "Seller" },
    "noLogin": "No sign-in account for this address. If it failed at sign-up, create the access: the person will receive an e-mail to choose a password.",
    "email": "E-mail:",
    "confirmed": "confirmed",
    "notConfirmed": "not confirmed",
    "lastLogin": "Last sign-in:",
    "never": "never",
    "banned": "Account blocked.",
    "shops": "Shops: {shops}",
    "actions": {
      "creer_acces": "Create the access",
      "lien": "Send a reset link",
      "confirmer": "Confirm the e-mail",
      "lien_a_transmettre": "Copy a link to pass on",
      "temporaire": "Temporary password"
    },
    "help": {
      "creer_acces": "The sign-in account of {email} will be created, e-mail already confirmed, and the person will receive a KatiMarket e-mail to choose a password (link valid for one hour). They will find their shop when signing in.",
      "lien": "A KatiMarket e-mail goes to {email} with a link valid for one hour. The person chooses their own password.",
      "confirmer": "{email} will be marked confirmed: the person can sign in without the confirmation e-mail. They will be told.",
      "lien_a_transmettre": "A reset link for {email} will be shown once, to pass on by WhatsApp or SMS. Valid for one hour, single use. The person will be told by e-mail.",
      "temporaire": "A password will be generated for {email} and shown once. At their next sign-in the person must choose a new one. They will be told by e-mail."
    },
    "reason": "Reason",
    "reasonHelp": "At least 5 characters. It is written to the log.",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "linkReady": "Link to pass on:",
    "passwordReady": "Temporary password:",
    "shownOnce": "It will not be shown again: copy it now.",
    "copy": "Copy",
    "copied": "Copied",
    "copyFailed": "Copy failed: select the text.",
    "close": "Close",
    "done": {
      "creer_acces": "Access created: the e-mail to choose a password has been sent",
      "lien": "Reset link sent by e-mail",
      "confirmer": "E-mail confirmed: the person can sign in",
      "alreadyConfirmed": "This e-mail was already confirmed"
    }
  }
}
</i18n>
