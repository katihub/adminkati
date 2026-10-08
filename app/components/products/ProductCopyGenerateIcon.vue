<script setup lang="ts">
import { useId } from "vue"

// SVG ids are document-wide, so each instance derives its own to keep masks and filters from colliding.
const uid = useId()
const mask = `cs-mask-${uid}`
const blur = `cs-blur-${uid}`
const wash = `cs-wash-${uid}`
const noise = `cs-noise-${uid}`
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <mask :id="mask" style="mask-type: alpha" width="200" height="190" x="0" y="5" maskUnits="userSpaceOnUse">
      <path
        fill="#fff"
        d="M106.086 101.973c125.219 40.51 75.067 109.249-2.324 3.183C181.153 211.222 100 237.478 100 106.372c0 131.106-81.146 104.85-3.762-1.216-77.384 106.066-127.543 37.327-2.324-3.183-125.219 40.51-125.219-44.478 0-3.94-125.219-40.517-75.06-109.257 2.324-3.184C18.854-11.224 100-37.48 100 93.633c0-131.113 81.153-104.857 3.762 1.216 77.391-106.073 127.543-37.333 2.324 3.183 125.219-40.516 125.219 44.451 0 3.941z"
      />
    </mask>
    <g :mask="`url(#${mask})`">
      <path fill="#fff" d="M200 0H0v200h200V0z" />
      <path :fill="`url(#${wash})`" d="M200 0H0v200h200V0z" />
      <g :filter="`url(#${blur})`">
        <ellipse
          cx="143.611"
          cy="184.18"
          fill="#FF58E4"
          rx="114.679"
          ry="58.126"
          transform="rotate(-33.875 143.611 184.18)"
        />
        <ellipse
          cx="68.482"
          cy="38.587"
          fill="#00F0FF"
          rx="69.531"
          ry="47.75"
          transform="rotate(-26.262 68.482 38.587)"
        />
      </g>
    </g>
    <defs>
      <filter
        :id="blur"
        width="401.584"
        height="438.421"
        x="-77.372"
        y="-94.144"
        color-interpolation-filters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feGaussianBlur stdDeviation="40" />
      </filter>
      <linearGradient :id="wash" x1="158.5" x2="29" y1="12.5" y2="200" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0E6FFF" />
        <stop offset="1" stop-color="#00F0FF" />
      </linearGradient>
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
