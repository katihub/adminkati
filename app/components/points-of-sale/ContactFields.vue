<script setup lang="ts">
import type { TelephonePointVente } from "@/types/api/vitrine"
import { computed, nextTick, ref, useTemplateRef } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { TEAM_PHONE_PLACEHOLDER } from "@/composables/useTeamPhone"
import { POINT_VENTE_TELEPHONES_MAX } from "@/schemas/point-vente"
import { emptyTelephoneRow, moveItem } from "@/utils/point-of-sale"
import { cameroonPhone, whatsappLink } from "@/utils/whatsapp"

const { errors } = defineProps<{
  /** One message per number row, in row order, then the opening hours. */
  errors: { telephones: string[]; horaires: string }
}>()

const telephones = defineModel<TelephonePointVente[]>("telephones", { required: true })
const horaires = defineModel<string>("horaires", { required: true })

const { t } = useI18n()
const rowsRef = useTemplateRef<HTMLDivElement>("rowsRef")
const announcement = ref("")

const INPUT_SELECTOR = "[data-testid='points-of-sale-form-telephone']"
const ADD_SELECTOR = "[data-testid='points-of-sale-form-telephone-add']"
const moveSelector = (offset: -1 | 1) => `[data-move='${offset}']`

/**
 * What each row will publish. Operators type "695549058" or "6 95 54 90 58"; showing the
 * stored form before saving means the published number is never a surprise, and a wa.me link
 * to try matters because a wrong digit is a storefront button that opens a stranger's chat.
 */
function savedAs(value: string, saved: string | null): string {
  if (!saved || saved === value.trim()) return ""
  return t("pointsOfSale.form.savedAs", { value: saved })
}

function whatsappPreview(row: TelephonePointVente, saved: string | null): string | null {
  if (!saved || !row.whatsapp || !cameroonPhone(row.numero, "mobile")) return null
  return whatsappLink(saved, "")
}

function telephonePreview(row: TelephonePointVente) {
  const saved = cameroonPhone(row.numero, "any")
  return {
    savedAs: savedAs(row.numero, saved),
    whatsapp: whatsappPreview(row, saved),
  }
}

const previews = computed(() => telephones.value.map(telephonePreview))

/** Rows are replaced, not mutated in place: the list belongs to the form that owns the model. */
function updateRow(index: number, change: Partial<TelephonePointVente>) {
  telephones.value = telephones.value.map((row, position) => (position === index ? { ...row, ...change } : row))
}

/**
 * Focus follows the rows, so adding, removing or moving a number with the keyboard never drops
 * it on the page: the first enabled match in the row at `index`, else the "Add" button. Callers
 * compute `index` before writing the model, whose value only changes once the parent re-renders.
 */
async function focusRow(index: number, selectors: string[]) {
  await nextTick()
  const rows = rowsRef.value?.querySelectorAll<HTMLElement>("[data-testid='points-of-sale-form-telephone-row']") ?? []
  const row = rows[Math.min(index, rows.length - 1)]
  const candidates = [
    ...selectors.map(selector => row?.querySelector<HTMLInputElement | HTMLButtonElement>(selector)),
    rowsRef.value?.querySelector<HTMLButtonElement>(ADD_SELECTOR),
  ]
  candidates.find(candidate => candidate && !candidate.disabled)?.focus()
}

function addRow() {
  const index = telephones.value.length
  telephones.value = [...telephones.value, emptyTelephoneRow()]
  void focusRow(index, [INPUT_SELECTOR])
}

function removeRow(index: number) {
  telephones.value = telephones.value.filter((_, position) => position !== index)
  void focusRow(index, [INPUT_SELECTOR])
}

/**
 * The storefront and the assistant list the numbers in this order, so the operator sets it.
 * Rows are keyed by position, so the values move and the DOM stays: focus is put back on the
 * same arrow of the moved number, or on the opposite one once it reaches an end.
 */
function moveRow(index: number, offset: -1 | 1) {
  const next = moveItem(telephones.value, index, offset)
  if (!next) return
  const to = index + offset
  telephones.value = next
  announcement.value = t("pointsOfSale.form.telephoneMoved", { position: to + 1, total: next.length })
  void focusRow(to, [moveSelector(offset), moveSelector(offset === 1 ? -1 : 1)])
}

function moveButtons(index: number) {
  return [
    {
      offset: -1 as const,
      name: "up",
      icon: "ph:arrow-up",
      label: t("pointsOfSale.form.telephoneMoveUp", { position: index + 1 }),
      disabled: index === 0,
    },
    {
      offset: 1 as const,
      name: "down",
      icon: "ph:arrow-down",
      label: t("pointsOfSale.form.telephoneMoveDown", { position: index + 1 }),
      disabled: index === telephones.value.length - 1,
    },
  ]
}
</script>

<template>
  <fieldset class="space-y-4">
    <legend class="sr-only">
      {{ t("pointsOfSale.form.contactLegend") }}
    </legend>

    <div ref="rowsRef" class="space-y-3">
      <ol v-if="telephones.length" class="space-y-3">
        <!-- Keyed by position: a number being typed has no identity yet, and two empty rows
             would share any key derived from their value. -->
        <li v-for="(row, index) in telephones" :key="index" data-testid="points-of-sale-form-telephone-row">
          <PointsOfSaleField
            :label="t('pointsOfSale.form.telephoneLabel', { position: index + 1 })"
            :hint="index === 0 ? t('pointsOfSale.form.telephonesHint') : ''"
            :detail="previews[index]?.savedAs"
            :error="errors.telephones[index]"
          >
            <template #default="{ field }">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Input
                  v-bind="field"
                  :model-value="row.numero"
                  data-testid="points-of-sale-form-telephone"
                  class="min-w-0 flex-1 basis-48"
                  type="tel"
                  autocomplete="off"
                  :placeholder="TEAM_PHONE_PLACEHOLDER"
                  @update:model-value="value => updateRow(index, { numero: String(value) })"
                />
                <div class="flex items-center gap-1">
                  <div class="mr-2 flex items-center gap-2">
                    <Switch
                      :id="`${field.id}-whatsapp`"
                      :model-value="row.whatsapp"
                      data-testid="points-of-sale-form-telephone-whatsapp"
                      :aria-label="t('pointsOfSale.form.telephoneWhatsapp', { position: index + 1 })"
                      @update:model-value="value => updateRow(index, { whatsapp: value })"
                    />
                    <Label :for="`${field.id}-whatsapp`" class="font-normal text-muted-foreground" aria-hidden="true">{{
                      t("pointsOfSale.form.whatsappSwitch")
                    }}</Label>
                  </div>
                  <Button
                    v-for="button in moveButtons(index)"
                    :key="button.name"
                    type="button"
                    variant="ghost"
                    size="icon"
                    :data-testid="`points-of-sale-form-telephone-move-${button.name}`"
                    :data-move="button.offset"
                    :aria-label="button.label"
                    :disabled="button.disabled"
                    @click="moveRow(index, button.offset)"
                  >
                    <Icon :name="button.icon" size="16" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-testid="points-of-sale-form-telephone-remove"
                    :aria-label="t('pointsOfSale.form.telephoneRemove', { position: index + 1 })"
                    @click="removeRow(index)"
                  >
                    <Icon name="ph:x" size="16" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </template>
            <template #after>
              <a
                v-if="previews[index]?.whatsapp"
                data-testid="points-of-sale-form-whatsapp-preview"
                :href="previews[index].whatsapp"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <Icon name="ph:whatsapp-logo" size="14" aria-hidden="true" />
                {{ t("pointsOfSale.form.whatsappPreview", { link: previews[index].whatsapp.replace("https://", "") }) }}
              </a>
            </template>
          </PointsOfSaleField>
        </li>
      </ol>

      <p data-testid="points-of-sale-form-telephone-announcement" class="sr-only" aria-live="polite">
        {{ announcement }}
      </p>

      <Button
        v-if="telephones.length < POINT_VENTE_TELEPHONES_MAX"
        type="button"
        variant="outline"
        class="border-dashed"
        size="sm"
        data-testid="points-of-sale-form-telephone-add"
        @click="addRow"
      >
        <Icon name="ph:plus" size="16" aria-hidden="true" />
        {{ t("pointsOfSale.form.telephoneAdd") }}
        <span class="font-normal text-muted-foreground">{{
          t("pointsOfSale.form.telephoneCount", { count: telephones.length, max: POINT_VENTE_TELEPHONES_MAX })
        }}</span>
      </Button>
    </div>

    <PointsOfSaleField :label="t('pointsOfSale.form.horairesLabel')" :error="errors.horaires">
      <template #default="{ field }">
        <Textarea
          v-bind="field"
          v-model="horaires"
          data-testid="points-of-sale-form-horaires"
          :placeholder="t('pointsOfSale.form.horairesPlaceholder')"
        />
      </template>
    </PointsOfSaleField>
  </fieldset>
</template>
