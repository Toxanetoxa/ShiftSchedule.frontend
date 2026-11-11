<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ label: string; sideOffset?: number; pending?: boolean }>(), {
  sideOffset: 8,
  pending: false,
})
const open = defineModel<boolean>('open', { default: false })
const returnFocus = ref<HTMLElement | null>(null)
watch(
  open,
  (value) => {
    if (value && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement)
      returnFocus.value = document.activeElement
  },
  { flush: 'sync' },
)
function restoreFocus(event: Event): void {
  if (returnFocus.value?.isConnected) {
    event.preventDefault()
    returnFocus.value.focus()
  }
}

function updateOpen(value: boolean, pending: boolean): void {
  if (!pending || value) open.value = value
}
</script>

<template>
  <PopoverRoot :open="open" @update:open="updateOpen($event, pending)">
    <PopoverTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        v-bind="$attrs"
        :class="$style.content"
        side="bottom"
        align="start"
        :side-offset="sideOffset"
        :aria-label="label"
        @close-auto-focus="restoreFocus"
        @escape-key-down="pending && $event.preventDefault()"
        @interact-outside="pending && $event.preventDefault()"
      >
        <slot :close="() => updateOpen(false, pending)" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style module lang="scss">
.content {
  z-index: var(--schedule-z-popover);
  color: var(--schedule-color-label-primary);
  background: var(--schedule-color-surface-primary);
  max-inline-size: var(--reka-popover-content-available-width, 100vw);
  max-block-size: var(--reka-popover-content-available-height, 100vh);
  transform-origin: var(--reka-popover-content-transform-origin, center);
  overflow: auto;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-panel);
  padding: var(--figma-spacing-padding-l);
  font-family: var(--schedule-font-family), system-ui, sans-serif;
}
</style>
