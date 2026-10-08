<script setup lang="ts">
import { computed } from "vue"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTeam } from "@/composables/useTeam"

/**
 * Who is taking this order out.
 *
 * WHY IT EXISTS. The goods change hands exactly once, at `en_remise`, and
 * whoever takes them is the only person who will then read, collect on, or
 * close that order — the backend scopes all three to the assigned courier.
 * Leaving the field blank is refused (400), so this control is the door.
 *
 * ACTIVE COURIERS ONLY. A deactivated account cannot sign in, and handing it
 * an order would produce a delivery nobody can act on.
 */
const { disabled = false } = defineProps<{
  disabled?: boolean
}>()

const model = defineModel<string | undefined>()
const { t } = useI18n()

const { data, isPending } = useTeam(() => ({ role: "livreur" as const, actif: true }))
const livreurs = computed(() => data.value?.pages.flatMap(page => page.elements) ?? [])
</script>

<template>
  <Select v-model="model" :disabled="disabled || isPending">
    <SelectTrigger id="orders-transition-dialog-livreur" data-testid="orders-transition-dialog-livreur" class="w-full">
      <SelectValue :placeholder="t('orders.actions.transitionDialog.livreurPlaceholder')" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem v-for="membre in livreurs" :key="membre.id" :value="membre.id">
          {{ membre.nom }}<template v-if="membre.telephone"> · {{ membre.telephone }} </template>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
