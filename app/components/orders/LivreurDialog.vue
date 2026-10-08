<script setup lang="ts">
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

defineProps<{
  reference: string
  pending: boolean
  error: string
}>()
const emit = defineEmits<{
  confirm: []
}>()
const open = defineModel<boolean>("open", { required: true })
const livreurId = defineModel<string | undefined>("livreurId")

const { t } = useI18n()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="orders-livreur-dialog">
      <DialogHeader>
        <DialogTitle>{{ t("orders.actions.livreurDialog.title") }}</DialogTitle>
        <DialogDescription>{{ t("orders.actions.livreurDialog.description", { reference }) }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <Label for="orders-transition-dialog-livreur">{{ t("orders.actions.livreurDialog.label") }}</Label>
        <OrdersLivreurSelect v-model="livreurId" :disabled="pending" />
        <p class="text-muted-foreground text-xs">
          {{ t("orders.actions.livreurDialog.hint") }}
        </p>
      </div>

      <p v-if="error" data-testid="orders-livreur-dialog-error" role="alert" class="text-sm text-destructive">
        {{ error }}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="pending" @click="open = false">
          {{ t("orders.actions.livreurDialog.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="orders-livreur-dialog-confirm"
          :disabled="pending || !livreurId"
          :aria-busy="pending ? true : undefined"
          @click="emit('confirm')"
        >
          <Spinner v-if="pending" data-icon="inline-start" />
          {{ t("orders.actions.livreurDialog.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
