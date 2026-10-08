<script setup lang="ts">
import type { CustomerAccountDetail } from "@/types/api/clients"
import { computed, ref, watch } from "vue"

const {
  detail,
  selected,
  isPending,
  error,
  canWrite = false,
  statusPending = false,
} = defineProps<{
  detail: CustomerAccountDetail | undefined
  selected: boolean
  isPending: boolean
  error: unknown
  canWrite?: boolean
  statusPending?: boolean
}>()

const emit = defineEmits<{
  retry: []
  back: []
  suspend: []
  reactivate: []
}>()

const { t } = useI18n()
const customerName = computed(() => detail?.profil?.nom ?? detail?.client.id ?? "")

const localTab = ref<"profile" | "orders">("profile")
const tabs = computed(() => [
  { value: "profile", label: t("users.tabs.profile"), testid: "users-detail-tab-profile" },
  { value: "orders", label: t("users.tabs.orders"), testid: "users-detail-tab-orders" },
])

watch(
  () => detail?.client.id,
  () => {
    localTab.value = "profile"
  },
)
</script>

<template>
  <div class="min-h-full" data-testid="users-detail-panel">
    <div v-if="error" class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center">
      <ApiErrorCard :error="error" @retry="emit('retry')" />
    </div>
    <div
      v-else-if="!selected"
      data-testid="users-detail-empty"
      class="flex h-full min-h-[20rem] items-center justify-center p-6"
    >
      <EmptyStateCard icon="ph:cursor-click" :text="t('users.page.empty')" />
    </div>
    <div v-else-if="isPending" class="flex h-full min-h-[20rem] items-center justify-center p-6 text-center">
      <p data-testid="users-detail-loading" class="text-sm text-muted-foreground">
        {{ t("users.page.loading") }}
      </p>
    </div>
    <article v-else-if="detail" data-testid="users-detail-content">
      <UsersDetailHeader :name="customerName" :status="detail.client.statut" @back="emit('back')">
        <template v-if="canWrite" #actions>
          <UsersStatusActions
            :status="detail.client.statut"
            :name="customerName"
            :pending="statusPending"
            @suspend="emit('suspend')"
            @reactivate="emit('reactivate')"
          />
        </template>
        <template #tabs>
          <PillTabs
            :model-value="localTab"
            :items="tabs"
            data-testid="users-detail-tabs"
            @update:model-value="value => (localTab = value as 'profile' | 'orders')"
          />
        </template>
      </UsersDetailHeader>
      <div class="p-4 sm:p-6">
        <UsersProfileTab v-if="localTab === 'profile'" :detail="detail" :name="customerName" />
        <UsersOrdersTab v-else-if="localTab === 'orders'" :client-id="detail.client.id" />
      </div>
    </article>
  </div>
</template>
