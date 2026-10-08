<script setup lang="ts">
import { useId } from "vue"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface Props {
  modelValue: string
  label: string
  placeholder?: string
  error?: string
  type?: "text" | "email" | "password"
  autocomplete?: string
  labelHidden?: boolean
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  type: "text",
  labelHidden: true,
})

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const inputId = useId()
const messageId = useId()
</script>

<template>
  <div>
    <Label :for="inputId" :class="cn('mb-2', labelHidden && 'sr-only')">
      {{ label }}
    </Label>

    <div class="relative">
      <Input
        :id="inputId"
        :model-value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? messageId : undefined"
        :class="
          cn(
            'h-14 rounded-xl border border-transparent bg-muted px-7 text-base transition-colors',
            'hover:bg-muted/70',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'aria-invalid:border-destructive',
            $slots.suffix && 'pr-16',
          )
        "
        @update:model-value="emit('update:modelValue', String($event))"
      />

      <div v-if="$slots.suffix" class="absolute inset-y-0 right-2 flex items-center">
        <slot name="suffix" />
      </div>
    </div>

    <p v-if="error" :id="messageId" class="mt-2 text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
