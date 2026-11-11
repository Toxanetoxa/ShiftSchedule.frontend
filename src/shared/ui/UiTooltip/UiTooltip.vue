<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
withDefaults(defineProps<{ label: string; delayDuration?: number }>(), { delayDuration: 300 })
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal
        ><TooltipContent :class="$style.content" :side-offset="6">{{
          label
        }}</TooltipContent></TooltipPortal
      >
    </TooltipRoot>
  </TooltipProvider>
</template>

<style module lang="scss">
.content {
  z-index: calc(var(--schedule-z-dialog) + 5);
  max-inline-size: 280px;
  padding: 8px 12px;
  border-radius: var(--schedule-radius-control);
  color: var(--schedule-color-label-inverted);
  background: var(--figma-backgrounds-neutral-primary-default);
  font:
    400 12px/16px var(--schedule-font-family),
    system-ui,
    sans-serif;
}
</style>
