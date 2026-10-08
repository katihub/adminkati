import type { Component } from "vue"
import { PhMagnifyingGlass } from "@phosphor-icons/vue"
import { h } from "vue"
import { Field, Operator } from "@/components/vuzeno/filters"

/** The permanent `q` chip every searchable toolbar starts with. */
export function searchFilterField(label: string, operatorLabel: string) {
  return Field.TextField({
    key: "q",
    label,
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: operatorLabel, default: true })],
  })
}

/** A chip whose value is picked from a fixed list, such as a status. */
export function selectFilterField(options: {
  key: string
  label: string
  icon: Component
  operatorLabel: string
  items: { label: string; value: string }[]
}) {
  return Field.TextField({
    key: options.key,
    label: options.label,
    icon: () => h(options.icon),
    operators: [
      Operator.Eq({
        label: options.operatorLabel,
        default: true,
        inputType: "select",
        options: { items: options.items },
      }),
    ],
  })
}
