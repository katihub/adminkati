<script setup lang="ts">
import { ref, useTemplateRef } from "vue"

/**
 * `focus` is horizontal-only — a percentage across the large artwork's width, never a
 * 2-D point (`sql/vitrine.sql:63-66`). Renders as an overlay over `BannerArtworkField`'s
 * own preview surface, positioned by whichever parent owns that layout.
 */
const { modelValue, disabled = false } = defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [value: number] }>()

const { t } = useI18n()

const trackRef = useTemplateRef<HTMLDivElement>("track")
const isDragging = ref(false)

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function focusFromClientX(clientX: number): number | null {
  const rect = trackRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  return clamp(((clientX - rect.left) / rect.width) * 100)
}

function updateFromClientX(clientX: number) {
  const next = focusFromClientX(clientX)
  if (next !== null) emit("update:modelValue", next)
}

function onTrackClick(event: MouseEvent) {
  if (disabled) return
  updateFromClientX(event.clientX)
}

function onPointerDown(event: PointerEvent) {
  if (disabled) return
  isDragging.value = true
  updateFromClientX(event.clientX)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  updateFromClientX(event.clientX)
}

function onPointerUp() {
  isDragging.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (disabled) return
  if (event.key === "ArrowLeft") {
    event.preventDefault()
    emit("update:modelValue", clamp(modelValue - 1))
  } else if (event.key === "ArrowRight") {
    event.preventDefault()
    emit("update:modelValue", clamp(modelValue + 1))
  }
}
</script>

<template>
  <div
    ref="track"
    data-testid="banner-focus-picker"
    class="absolute inset-0 cursor-ew-resize"
    @click="onTrackClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div
      role="slider"
      tabindex="0"
      data-testid="banner-focus-picker-handle"
      class="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
      :style="{ left: `${modelValue}%` }"
      :aria-valuenow="modelValue"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-label="t('content.banners.form.focusLabel')"
      @keydown="onKeydown"
    />
  </div>
</template>
