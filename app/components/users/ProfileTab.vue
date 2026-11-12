<script setup lang="ts">
import type { CustomerAccountDetail } from "@/types/api/clients"
import { computed } from "vue"
import { isAdministration } from "@/utils/administration"

const { detail, name } = defineProps<{
  detail: CustomerAccountDetail
  name: string
}>()

const { t } = useI18n()
/* Helping the customer back in (9 November 2026): the direction only; the counter reads the directory. */
const session = useCachedSession()
const canManageAccess = computed(() => isAdministration(session.value?.roles))
const profileMetadata = computed(() =>
  [detail.profil?.telephone, detail.profil?.ville, detail.profil?.comptoirPrefere].filter((value): value is string =>
    Boolean(value),
  ),
)
</script>

<template>
  <div class="space-y-4">
    <UsersIncompleteProfileState v-if="!detail.profil" />
    <!--
      LE COMPTE RESTE LISIBLE MÊME SANS PROFIL. Un profil manquant cachait
      aussi le statut et le dernier accès, alors que ce sont eux qui disent
      si le compte sert encore — et que la suspension se décide dessus.
    -->
    <PeopleProfileCard :eyebrow="t('users.detail.profileOverview')" :title="name" :metadata="profileMetadata">
      <UsersAccountDetails :account="detail.client" />
      <UsersProfileDetails v-if="detail.profil" :profile="detail.profil" />
      <UsersAddressList :addresses="detail.adresses" />
    </PeopleProfileCard>
    <AccountsAccountAccessPanel v-if="canManageAccess && detail.client.courriel" :email="detail.client.courriel" />
  </div>
</template>
