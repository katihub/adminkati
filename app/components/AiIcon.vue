<script setup lang="ts">
import { computed, useId } from "vue"
import { sampleAiIcon } from "@/utils/ai-icon-morph"

// 0 is the artwork at rest; see `sampleAiIcon` for the shapes in between.
const props = withDefaults(defineProps<{ phase?: number }>(), { phase: 0 })

// SVG ids are document-wide, so each instance derives its own to keep masks and filters from colliding.
const uid = useId()
const mask = `cs-mask-${uid}`
const clip = `cs-clip-${uid}`
const blur = `cs-blur-${uid}`
const noise = `cs-noise-${uid}`
const wash = `cs-wash-${uid}`

const frame = computed(() => sampleAiIcon(props.phase))
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <g :clip-path="`url(#${clip})`">
      <mask :id="mask" style="mask-type: alpha" width="200" height="200" x="0" y="0" maskUnits="userSpaceOnUse">
        <path fill="#fff" :d="frame.mask" />
      </mask>
      <g :mask="`url(#${mask})`">
        <path fill="#fff" d="M200 0H0v200h200V0z" />
        <path fill="#FFF500" :fill-opacity="frame.tint" d="M200 0H0v200h200V0z" />
        <path v-if="frame.wash > 0" :fill="`url(#${wash})`" :opacity="frame.wash" d="M200 0H0v200h200V0z" />
        <g :filter="`url(#${blur})`">
          <rect v-for="(blob, index) in frame.blobs" :key="index" v-bind="blob" />
        </g>
      </g>
    </g>
    <defs>
      <filter
        :id="blur"
        width="442"
        height="436"
        x="-140"
        y="-110"
        color-interpolation-filters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur result="effect1_foregroundBlur" :stdDeviation="frame.blur" />
      </filter>
      <linearGradient :id="wash" x1="186.5" x2="37" y1="37" y2="186.5" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0E6FFF" stop-opacity="0.51" />
        <stop offset="1" stop-color="#00F0FF" stop-opacity="0.59" />
      </linearGradient>
      <clipPath :id="clip">
        <path fill="#fff" d="M0 0H200V200H0z" />
      </clipPath>
      <filter :id="noise" width="100%" height="100%" x="0%" y="0%" filterUnits="objectBoundingBox">
        <feTurbulence baseFrequency="0.6" numOctaves="5" result="out1" seed="4" />
        <feComposite in="out1" in2="SourceGraphic" operator="in" result="out2" />
        <feBlend in="SourceGraphic" in2="out2" mode="overlay" result="out3" />
      </filter>
    </defs>
    <g style="mix-blend-mode: overlay" :mask="`url(#${mask})`">
      <path fill="gray" stroke="transparent" d="M200 0H0v200h200V0z" :filter="`url(#${noise})`" />
    </g>
  </svg>
</template>
