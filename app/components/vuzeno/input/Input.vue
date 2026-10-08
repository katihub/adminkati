<script setup lang="ts">
import { ark } from "@ark-ui/vue";
import { useFieldContext } from "@ark-ui/vue/field";
import { cn } from "cnfast";
import { computed, type HTMLAttributes, type InputHTMLAttributes } from "vue";
import { type InputVariantsProps, inputVariants } from "../input";

type Props = Omit<InputHTMLAttributes, "class" | "defaultValue" | "size" | "value"> & InputVariantsProps & {
  class?: HTMLAttributes["class"];
  modelValue?: string | number;
  defaultValue?: string | number;
};

const props = defineProps<Props>();
const emits = defineEmits<(e: "update:modelValue", payload: string | number) => void>();
const delegatedPropNames = new Set(["class", "size", "modelValue", "defaultValue"]);
const inputValues = props as unknown as { modelValue?: string | number; defaultValue?: string | number };

const field = useFieldContext();

const delegatedProps = computed(() => {
  const context = field?.value.getInputProps();
  const inputProps = Object.fromEntries(Object.entries(props as unknown as Record<string, unknown>).filter(([name, value]) => !delegatedPropNames.has(name) && value !== undefined));

  return {
    value: inputValues.modelValue ?? inputValues.defaultValue,
    ...context,
    ...inputProps,
  };
});
</script>

<template>
  <ark.input
    v-bind="delegatedProps"
    :class="cn(inputVariants({ size: props.size }), props.class)"
    data-slot="field-input"
    @input="emits('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
    <slot />
  </ark.input>
</template>
