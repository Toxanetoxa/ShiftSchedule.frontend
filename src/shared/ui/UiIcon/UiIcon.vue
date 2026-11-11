<script setup lang="ts">
import type { IconName } from './icons'
import { useId } from 'vue'
import { iconPaths } from './icons'

withDefaults(defineProps<{ name: IconName; size?: number; title?: string }>(), { size: 20 })
const titleId = useId()
</script>

<template>
  <svg
    :class="$style.icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="title ? undefined : true"
    :aria-labelledby="title ? titleId : undefined"
    :role="title ? 'img' : undefined"
    focusable="false"
  >
    <title v-if="title" :id="titleId">{{ title }}</title>
    <path :d="iconPaths[name]" />
  </svg>
</template>

<style module lang="scss">
.icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
}
</style>
