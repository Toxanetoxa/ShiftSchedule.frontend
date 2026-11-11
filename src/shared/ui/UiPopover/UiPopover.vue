<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    label: string
    sideOffset?: number
    pending?: boolean
    reference?: HTMLElement | null
  }>(),
  { sideOffset: 8, pending: false, reference: null },
)
const open = defineModel<boolean>('open', { default: false })
const returnFocus = ref<HTMLElement | null>(null)
let interactedOutside = false
watch(
  [open, () => props.reference],
  ([value]) => {
    if (value) {
      interactedOutside = false
      returnFocus.value =
        props.reference ||
        (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null)
    }
  },
  { flush: 'sync', immediate: true },
)
function restoreFocus(event: Event): void {
  if (!interactedOutside && returnFocus.value?.isConnected) {
    event.preventDefault()
    returnFocus.value.focus({ preventScroll: true })
  }
}
function interactOutside(event: Event): void {
  if (props.pending) event.preventDefault()
  else interactedOutside = true
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
        :reference="reference || undefined"
        :aria-label="label"
        @close-auto-focus="restoreFocus"
        @escape-key-down="pending && $event.preventDefault()"
        @interact-outside="interactOutside"
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
