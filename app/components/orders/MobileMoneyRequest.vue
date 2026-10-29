<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { useQueryClient } from "@tanstack/vue-query"
import { ref } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"

/* THE CUSTOMER PAYS ON THEIR PHONE, CONFIRMED BY KRATOSPAY. The counter or the
   order's courier sends the prompt; the amount is read from the order by the
   backend. Nothing is collected until Kratospay confirms: the balance then
   drops by itself, with no cash in anyone's hand. */
const { order } = defineProps<{ order: CommandeDetail }>()

const { t } = useI18n()
const apiWrite = useApiWrite()
const queryClient = useQueryClient()
const telephone = ref(order.telephoneLivraison ?? "")
const operateur = ref("")
const pending = ref(false)

async function send() {
  if (pending.value || !telephone.value.trim()) return
  pending.value = true
  try {
    const result = await apiWrite<{ statut: string }>("/paiements/direct", {
      method: "POST",
      body: {
        reference: order.reference,
        telephone: telephone.value.trim(),
        ...(operateur.value ? { operateur: operateur.value } : {}),
      },
    })
    toast.success(t(result.statut === "paye" ? "orders.detail.mobileMoney.paid" : "orders.detail.mobileMoney.sent"))
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.orders.detail(order.reference) })
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="rounded-2xl bg-card p-4 space-y-2" data-testid="orders-detail-mobile-money" @submit.prevent="send">
    <p class="text-sm font-semibold">{{ t("orders.detail.mobileMoney.title") }}</p>
    <p class="text-xs text-muted-foreground">{{ t("orders.detail.mobileMoney.help") }}</p>
    <div class="flex flex-wrap items-center gap-2">
      <Input
        v-model="telephone"
        type="tel"
        inputmode="tel"
        class="w-44"
        :aria-label="t('orders.detail.mobileMoney.phone')"
        :placeholder="t('orders.detail.mobileMoney.phone')"
        data-testid="orders-detail-mobile-money-phone"
      />
      <NativeSelect v-model="operateur" class="w-48" :aria-label="t('orders.detail.mobileMoney.operator')">
        <NativeSelectOption value="">{{ t("orders.detail.mobileMoney.auto") }}</NativeSelectOption>
        <NativeSelectOption value="orange">{{ t("orders.detail.mobileMoney.orange") }}</NativeSelectOption>
        <NativeSelectOption value="mtn">{{ t("orders.detail.mobileMoney.mtn") }}</NativeSelectOption>
      </NativeSelect>
      <Button
        type="submit"
        size="sm"
        :disabled="pending || !telephone.trim()"
        data-testid="orders-detail-mobile-money-send"
        >{{ t("orders.detail.mobileMoney.send") }}</Button
      >
    </div>
  </form>
</template>
