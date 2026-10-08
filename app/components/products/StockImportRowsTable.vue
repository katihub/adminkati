<script setup lang="ts">
import type { LigneResultatImport } from "@/types/api/stock-import"
import { Table } from "@/components/vuzeno/table"

const { preview = false } = defineProps<{ lines: LigneResultatImport[]; preview?: boolean }>()
const { t } = useI18n()
const columns = ["line", "product", "status", "variation", "balance", "details"] as const
</script>

<template>
  <div class="max-h-[40vh] overflow-y-auto rounded-xl">
    <Table.Root class="text-left">
      <Table.Header>
        <Table.Row>
          <Table.Head v-for="column in columns" :key="column" scope="col" class="-mx-2">
            {{ t(`products.stockImport.columns.${preview && column === "balance" ? "updates" : column}`) }}
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <ProductsStockImportResultRow v-for="line in lines" :key="line.ligne" :line="line" :preview="preview" />
      </Table.Body>
    </Table.Root>
  </div>
</template>
