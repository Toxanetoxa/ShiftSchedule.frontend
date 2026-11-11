<script setup lang="ts">
import type { CalendarView, CellRef, ShiftViewModel } from '@schedule/domain/types'
import { useDraggable, useDroppable } from '@dnd-kit/vue'
import { sameCell, useScheduleDnd } from '@schedule/dnd/context'
import { formatMinutes, formatShiftTime } from '@schedule/domain/format'
import ShiftChip from '@schedule/ui/ShiftChip/ShiftChip.vue'
import { UiIcon } from '@ui'
import { computed, ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    cell: CellRef
    employeeName: string
    shift?: ShiftViewModel | null
    view?: CalendarView
    selected?: boolean
    keyboardActive?: boolean
    disabled?: boolean
    dirty?: boolean
    conflict?: boolean
    dropState?: 'none' | 'allowed' | 'blocked'
    dragEnabled?: boolean
  }>(),
  {
    shift: null,
    view: 'week',
    selected: false,
    keyboardActive: false,
    disabled: false,
    dirty: false,
    conflict: false,
    dropState: 'none',
    dragEnabled: false,
  },
)

const emit = defineEmits<{
  focus: [event: FocusEvent]
  activate: [event: MouseEvent | KeyboardEvent]
  toggleSelection: [event: MouseEvent | KeyboardEvent]
  requestMove: [event: KeyboardEvent]
  openActions: [event: MouseEvent | KeyboardEvent]
}>()

const element = ref<HTMLDivElement | null>(null)
const dnd = useScheduleDnd()
const draggable = dnd
  ? useDraggable({
      id: () => `${dnd.scope}:assignment:${props.cell.employeeId}:${props.cell.workDate}`,
      element,
      type: 'assignment',
      data: () => ({ payload: { kind: 'assignment', source: { ...props.cell } } }),
      disabled: () => !props.dragEnabled || props.disabled || !props.shift || dnd.disabled.value,
    })
  : null
if (dnd) {
  useDroppable({
    id: () => `${dnd.scope}:cell:${props.cell.employeeId}:${props.cell.workDate}`,
    element,
    accept: ['template', 'assignment'],
    data: () => ({ cell: { ...props.cell } }),
    disabled: () => !props.dragEnabled || props.disabled || dnd.disabled.value,
  })
}
const dragging = computed(() => Boolean(draggable?.isDragging.value || draggable?.isDropping.value))
const currentDropState = computed(() =>
  props.dragEnabled && dnd?.payload.value && sameCell(dnd.target.value, props.cell)
    ? dnd.allowed.value
      ? 'allowed'
      : 'blocked'
    : props.dropState,
)
const accessibleLabel = computed(() =>
  [
    props.employeeName,
    props.cell.workDate,
    props.shift
      ? `${formatShiftTime(props.shift)}${props.shift.endDayOffset ? ', окончание на следующий день' : ''}, ${formatMinutes(props.shift.durationMinutes)}`
      : 'нет смены',
    props.selected ? 'выбрана' : undefined,
    props.conflict ? 'конфликт изменений' : props.dirty ? 'изменения не сохранены' : undefined,
    props.disabled ? 'недоступно' : undefined,
    currentDropState.value === 'blocked' ? 'перенос недоступен' : undefined,
  ]
    .filter(Boolean)
    .join(', '),
)

function onClick(event: MouseEvent): void {
  if (props.disabled || event.defaultPrevented || dnd?.suppressClick(event)) {
    return
  }

  if (event.ctrlKey || event.metaKey) {
    emit('toggleSelection', event)
  } else {
    emit('activate', event)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) {
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    emit('activate', event)
  } else if (event.key === ' ') {
    event.preventDefault()
    emit('toggleSelection', event)
  } else if (event.key === 'F10' && event.shiftKey) {
    event.preventDefault()
    emit('openActions', event)
  } else if (
    event.altKey &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    event.preventDefault()
    event.stopPropagation()
    if (props.shift) emit('requestMove', event)
  }
}

function onContextMenu(event: MouseEvent): void {
  if (props.disabled) {
    return
  }

  event.preventDefault()
  emit('openActions', event)
}

function focus(options?: FocusOptions): void {
  element.value?.focus(options)
}

defineExpose({ element, focus })
</script>

<template>
  <div
    ref="element"
    v-bind="$attrs"
    :class="$style.cell"
    role="gridcell"
    :tabindex="keyboardActive && !disabled ? 0 : -1"
    :aria-label="accessibleLabel"
    :aria-selected="selected"
    :aria-disabled="disabled || undefined"
    :aria-describedby="
      [
        $attrs['aria-describedby'],
        dnd && dragEnabled ? `schedule-dnd-instructions-${dnd.scope}` : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined
    "
    :data-view="view"
    :data-tone="shift?.colorKey"
    :data-assigned="Boolean(shift)"
    :data-selected="selected"
    :data-dirty="dirty"
    :data-conflict="conflict"
    :data-drop-state="currentDropState"
    :data-dragging="dragging || undefined"
    :data-drag-enabled="
      Boolean(dnd && dragEnabled && shift && !disabled && !dnd.disabled.value) || undefined
    "
    :draggable="false"
    @focus="emit('focus', $event)"
    @click="onClick"
    @keydown="onKeydown"
    @contextmenu="onContextMenu"
  >
    <ShiftChip
      v-if="shift"
      :class="$style.shift"
      :shift="shift"
      :view="view"
      :selected="selected"
    />
    <div v-else :class="$style.empty" aria-hidden="true">
      <UiIcon v-if="selected" name="plus" :size="20" />
    </div>
    <span v-if="conflict" :class="$style.conflict" aria-hidden="true" title="Конфликт изменений"
      ><UiIcon name="warning" :size="14"
    /></span>
    <span
      v-else-if="dirty"
      :class="$style.dirty"
      aria-hidden="true"
      title="Изменения не сохранены"
    />
  </div>
</template>

<style module lang="scss">
.cell {
  box-sizing: border-box;
  min-block-size: var(--schedule-row-height);
  padding: var(--schedule-cell-padding);
  position: relative;
  min-inline-size: 0;
  outline: none;
  cursor: pointer;
  &[data-view='week'] {
    min-inline-size: var(--schedule-week-cell-min-width);
  }
  &[data-view='month'] {
    inline-size: var(--schedule-month-cell-width);
  }

  &[data-drag-enabled='true'] {
    touch-action: none;
    cursor: grab;
  }
  &[data-dragging='true'] .shift {
    opacity: 0.45;
  }

  &[data-selected='true'] {
    box-shadow: inset 0 0 0 var(--schedule-grid-line-width) var(--schedule-cell-selected-border);
  }

  &[data-selected='true'][data-assigned='false'],
  &[data-selected='true'][data-assigned='false'] .empty {
    background: var(--schedule-cell-selected-bg);
  }

  &[data-selected='true'] .empty {
    border-color: transparent;
  }

  &:focus-visible {
    z-index: 1;
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: calc(-1 * var(--schedule-focus-width));
  }

  &[data-drop-state='allowed'] .shift,
  &[data-drop-state='allowed'] .empty {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: -2px;
  }

  &[data-drop-state='blocked'] .shift,
  &[data-drop-state='blocked'] .empty {
    outline: var(--schedule-focus-width) dashed var(--schedule-color-field-error);
    outline-offset: -2px;
  }

  &[aria-disabled='true'] {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--schedule-shift-height);
  border: var(--schedule-grid-line-width) dashed var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-control);
  color: var(--schedule-cell-selected-border);
}

.dirty,
.conflict {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-end: 6px;
  pointer-events: none;
}

.dirty {
  inline-size: 6px;
  block-size: 6px;
  border-radius: var(--schedule-radius-pill);
  background: var(--schedule-color-brand-action);
  box-shadow: 0 0 0 1px var(--schedule-color-surface-primary);
}

.conflict {
  display: flex;
  color: var(--schedule-color-field-error);
  background: var(--schedule-color-surface-primary);
  border-radius: 2px;
}
</style>
