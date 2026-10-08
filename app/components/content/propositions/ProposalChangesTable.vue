<script setup lang="ts">
import type { CatalogueProposal } from "@/types/api/catalogue"
import { computed } from "vue"
import { Table } from "@/components/vuzeno/table"
import { formatProposalValue } from "@/utils/proposal-values"

const { proposal, categories } = defineProps<{
  proposal: CatalogueProposal
  categories: ReadonlyMap<number, string>
}>()

const { locale, t } = useI18n()

const rows = computed(() =>
  Object.entries(proposal.champs).map(([field, change]) => ({
    field,
    label: t(`content.propositions.fields.${field}`, field),
    before: formatProposalValue(field, change?.avant, {
      categories,
      emptyLabel: t("content.propositions.values.empty"),
      locale: locale.value,
      noLabel: t("content.propositions.values.no"),
      yesLabel: t("content.propositions.values.yes"),
    }),
    after: formatProposalValue(field, change?.apres, {
      categories,
      emptyLabel: t("content.propositions.values.empty"),
      locale: locale.value,
      noLabel: t("content.propositions.values.no"),
      yesLabel: t("content.propositions.values.yes"),
    }),
  })),
)
</script>

<template>
  <div data-testid="proposal-changes-table">
    <Table.Root class="text-left">
      <Table.Header>
        <Table.Row>
          <Table.Head scope="col">
            {{ t("content.propositions.changes.field") }}
          </Table.Head>
          <Table.Head scope="col">
            {{ t("content.propositions.changes.before") }}
          </Table.Head>
          <Table.Head scope="col">
            {{ t("content.propositions.changes.after") }}
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row v-for="row in rows" :key="row.field" data-testid="proposal-change-row">
          <Table.Cell class="font-medium text-foreground">
            {{ row.label }}
          </Table.Cell>
          <Table.Cell class="text-muted-foreground">
            {{ row.before }}
          </Table.Cell>
          <Table.Cell class="font-medium text-foreground">
            {{ row.after }}
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  </div>
</template>
