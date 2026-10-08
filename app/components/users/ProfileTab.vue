<script setup lang="ts">
import type { CustomerAccountDetail } from "@/types/api/clients"
import { computed } from "vue"

const { detail, name } = defineProps<{
  detail: CustomerAccountDetail
  name: string
}>()

const { t } = useI18n()
const profileMetadata = computed(() =>
  [detail.profil?.telephone, detail.profil?.comptoirPrefere].filter((value): value is string => Boolean(value)),
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
  </div>
</template>
