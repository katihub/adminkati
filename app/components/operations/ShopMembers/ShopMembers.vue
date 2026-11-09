<script setup lang="ts">
import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
import { ref } from "vue"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
const { members } = defineProps<{ members: SellerReviewDetail["boutiques"][number]["membres"] }>()
const { t } = useI18n({ useScope: "local" })
/* The account of a shop member (9 November 2026): the backend keeps a focal point to its own shops. */
const access = ref<string | null>(null)
/** A dialable number: digits and the leading plus only. */
const dial = (phone: string) => phone.replace(/[^\d+]/g, "")
</script>
<template>
  <div>
    <h4 class="text-sm font-semibold">{{ t("members") }}</h4>
    <p v-if="!members.length" class="mt-2 text-sm text-muted-foreground">{{ t("none") }}</p>
    <ul v-else class="divide-y divide-border text-sm">
      <li v-for="member in members" :key="member.id" class="flex flex-col gap-1 py-2">
        <strong>{{ member.nom }}</strong
        ><a :href="`mailto:${member.courriel}`" class="break-all underline-offset-2 hover:underline">{{
          member.courriel
        }}</a
        ><a
          v-if="member.telephone"
          :href="`tel:${dial(member.telephone)}`"
          class="underline-offset-2 hover:underline"
          data-testid="shop-member-phone"
          >{{ member.telephone }}</a
        ><span v-else class="text-muted-foreground">{{ t("noPhone") }}</span
        ><span class="text-xs text-muted-foreground"
          >{{ member.roles.join(", ") }} · {{ t(member.actif ? "active" : "inactive") }}</span
        ><Button
          size="sm"
          variant="outline"
          class="mt-1 w-fit"
          :data-testid="`shop-member-access-${member.id}`"
          @click="access = member.courriel"
          ><Icon name="ph:key" /> {{ t("access") }}</Button
        >
      </li>
    </ul>
    <Dialog :open="Boolean(access)" @update:open="value => (value ? null : (access = null))">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t("access") }}</DialogTitle>
          <DialogDescription class="break-all">{{ access }}</DialogDescription>
        </DialogHeader>
        <AccountsAccountAccessPanel v-if="access" :email="access" />
      </DialogContent>
    </Dialog>
  </div>
</template>
<i18n lang="json">
{
  "en": {
    "members": "Shop members",
    "none": "No member recorded.",
    "noPhone": "No phone given",
    "active": "Active",
    "inactive": "Inactive",
    "access": "Account access"
  },
  "fr": {
    "members": "Membres de la boutique",
    "none": "Aucun membre enregistré.",
    "noPhone": "Téléphone non renseigné",
    "active": "Actif",
    "inactive": "Inactif",
    "access": "Accès au compte"
  }
}
</i18n>
