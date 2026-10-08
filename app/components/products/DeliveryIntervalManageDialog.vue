<script setup lang="ts">
import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useArchiveDeliveryInterval, useRestoreDeliveryInterval } from "@/composables/useDeliveryIntervalMutations"
import { useDeliveryIntervals } from "@/composables/useDeliveryIntervals"
import { apiErrorText } from "@/utils/api-error"
import { sortDeliveryIntervals } from "@/utils/delivery-interval"

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ "update:open": [value: boolean] }>()

const { t } = useI18n()
const { data: options, isPending, isError, refetch } = useDeliveryIntervals()
const archive = useArchiveDeliveryInterval()
const restore = useRestoreDeliveryInterval()

const rows = computed(() => sortDeliveryIntervals(options.value ?? []))
const isWriting = computed(() => archive.isPending.value || restore.isPending.value)

const editing = ref<DelaiLivraison | null>(null)
const editOpen = ref(false)
const actionError = ref("")

watch(
  () => props.open,
  value => {
    if (value) actionError.value = ""
  },
)

function openEdit(option: DelaiLivraison) {
  editing.value = option
  editOpen.value = true
}

function toggleActive(mutation: typeof archive | typeof restore, id: number) {
  actionError.value = ""
  mutation.mutate(id, {
    onError: error => {
      actionError.value = apiErrorText(error, t)
    },
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="value => emit('update:open', value)">
    <DialogContent data-testid="delivery-manage-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("products.delivery.manage.title") }}</DialogTitle>
        <DialogDescription>{{ t("products.delivery.manage.description") }}</DialogDescription>
      </DialogHeader>

      <div v-if="isPending" data-testid="delivery-manage-loading" class="space-y-2">
        <Skeleton v-for="index in 4" :key="index" class="h-12 w-full" />
      </div>

      <div
        v-else-if="isError"
        data-testid="delivery-manage-error"
        role="alert"
        class="flex items-center justify-between gap-3 text-sm text-destructive"
      >
        <span>{{ t("products.delivery.manage.loadError") }}</span>
        <Button type="button" variant="outline" size="sm" data-testid="delivery-manage-retry" @click="refetch()">
          {{ t("products.delivery.manage.retry") }}
        </Button>
      </div>

      <ul v-else class="space-y-2">
        <ProductsDeliveryIntervalRow
          v-for="option in rows"
          :key="option.id"
          :option="option"
          :busy="isWriting"
          @edit="openEdit(option)"
          @archive="toggleActive(archive, option.id)"
          @restore="toggleActive(restore, option.id)"
        />
      </ul>

      <p v-if="actionError" data-testid="delivery-manage-error" role="alert" class="text-sm text-destructive">
        {{ actionError }}
      </p>
    </DialogContent>
  </Dialog>

  <ProductsDeliveryIntervalDialog v-model:open="editOpen" :interval="editing" />
</template>
