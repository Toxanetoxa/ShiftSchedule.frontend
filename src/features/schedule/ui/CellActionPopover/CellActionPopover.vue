<script setup lang="ts">
import type { CellRef, ShiftTemplate, ShiftViewModel } from '@schedule/domain/types'
import { UiButton } from '@ui'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { watch } from 'vue'

const props = withDefaults(
  defineProps<{
    cell: CellRef
    templates: readonly ShiftTemplate[]
    shift?: ShiftViewModel | null
    disabled?: boolean
    reference?: HTMLElement | null
  }>(),
  { shift: null, disabled: false, reference: null },
)
const emit = defineEmits<{
  applyTemplate: [templateId: string]
  editCustom: []
  clear: []
  startMove: []
}>()
const open = defineModel<boolean>('open', { default: false })
let restoreToReference = true
watch([open, () => props.reference], ([value]) => {
  if (value) restoreToReference = true
})
function editOrMove(action: 'editCustom' | 'startMove'): void {
  restoreToReference = false
  if (action === 'editCustom') emit('editCustom')
  else emit('startMove')
}
function restoreFocus(event: Event): void {
  if (!props.reference) return
  event.preventDefault()
  if (restoreToReference && props.reference.isConnected)
    props.reference.focus({ preventScroll: true })
}
</script>

<template>
  <DropdownMenuRoot v-model:open="open" :modal="!reference">
    <DropdownMenuTrigger v-if="!reference" as-child
      ><slot name="trigger"
        ><UiButton color="neutral" variant="tertiary" size="compact" :disabled="disabled"
          >Действия со сменой</UiButton
        ></slot
      ></DropdownMenuTrigger
    >
    <DropdownMenuPortal>
      <DropdownMenuContent
        :class="$style.menu"
        :side-offset="6"
        :reference="reference || undefined"
        align="start"
        :aria-label="`Действия со сменой ${cell.workDate}`"
        @close-auto-focus="restoreFocus"
        @interact-outside="restoreToReference = false"
      >
        <DropdownMenuLabel :class="$style.label">{{ cell.workDate }}</DropdownMenuLabel>
        <DropdownMenuItem
          :class="$style.item"
          :disabled="disabled"
          @select="editOrMove('editCustom')"
          >Своя смена…</DropdownMenuItem
        >
        <DropdownMenuItem
          v-for="template in templates"
          :key="template.id"
          :class="$style.item"
          :disabled="disabled"
          @select="emit('applyTemplate', template.id)"
          >Назначить «{{ template.label }}»</DropdownMenuItem
        >
        <DropdownMenuSeparator :class="$style.separator" />
        <DropdownMenuItem
          :class="$style.item"
          :disabled="disabled || !shift"
          @select="editOrMove('startMove')"
          >Перенести смену…</DropdownMenuItem
        >
        <DropdownMenuItem
          :class="[$style.item, $style.danger]"
          :disabled="disabled || !shift"
          @select="emit('clear')"
          >Очистить смену</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style module lang="scss">
.menu {
  z-index: var(--schedule-z-popover);
  min-inline-size: 240px;
  max-inline-size: min(360px, calc(100vw - 24px));
  padding: 6px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-panel);
  color: var(--schedule-color-label-primary);
  background: var(--schedule-color-surface-primary);
  font:
    400 14px/20px var(--schedule-font-family),
    system-ui,
    sans-serif;
}
.label {
  padding: 8px;
  font-size: 12px;
  color: var(--schedule-color-label-secondary);
}
.item {
  padding: 10px 12px;
  border-radius: var(--schedule-radius-control);
  cursor: pointer;
  outline: none;

  &[data-highlighted] {
    background: var(--schedule-color-surface-muted);
  }
  &[data-disabled] {
    color: var(--schedule-color-label-secondary);
    cursor: not-allowed;
  }
}
.danger {
  color: var(--schedule-color-field-error);
}
.separator {
  block-size: 1px;
  margin: 4px;
  background: var(--schedule-color-border-subtle);
}
</style>
