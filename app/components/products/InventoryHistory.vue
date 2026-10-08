<script setup lang="ts">
import type { MouvementStock } from "@/types/api/inventaire"
import { Button } from "@/components/ui/button"
import { Table } from "@/components/vuzeno/table"

defineProps<{
  movements: MouvementStock[]
  total: number
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreFailed: boolean
}>()

defineEmits<{ loadMore: [] }>()

const { t } = useI18n()
const columns = ["date", "type", "variation", "balance", "reason", "actor", "order"] as const
</script>

<template>
  <div>
    <Table.Root class="text-left">
      <Table.Header>
        <Table.Row>
          <Table.Head v-for="column in columns" :key="column" scope="col" class="-mx-2">
            {{ t(`products.inventory.columns.${column}`) }}
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <ProductsInventoryMovementRow v-for="movement in movements" :key="movement.id" :movement="movement" />
      </Table.Body>
    </Table.Root>
    <p class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground xl:hidden">
      <Icon name="ph:arrows-left-right" aria-hidden="true" />
      {{ t("products.inventory.scrollHint") }}
    </p>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted-foreground">
        {{ t("products.inventory.showing", { count: movements.length, total }) }}
      </p>
      <p v-if="loadMoreFailed" data-testid="product-inventory-more-error" role="alert" class="text-xs text-destructive">
        {{ t("products.inventory.loadMoreError") }}
      </p>
      <Button
        v-if="hasMore"
        type="button"
        variant="outline"
        size="sm"
        data-testid="product-inventory-load-more"
        :disabled="isLoadingMore"
        @click="$emit('loadMore')"
      >
        <Spinner v-if="isLoadingMore" data-icon="inline-start" />
        {{ t("products.inventory.loadMore") }}
      </Button>
    </div>
  </div>
</template>
