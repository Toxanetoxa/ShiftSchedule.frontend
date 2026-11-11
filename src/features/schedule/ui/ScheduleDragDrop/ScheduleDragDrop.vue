<script setup lang="ts">
import type {
  BeforeDragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  Droppable,
} from '@dnd-kit/dom'
import type { DragDropProviderProps } from '@dnd-kit/vue'
import type { CellRef, DragPayload, ShiftTemplate, ShiftViewModel } from '@schedule/domain/types'
import { Accessibility, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { DragDropProvider, DragOverlay } from '@dnd-kit/vue'
import { readCell, readPayload, sameCell, scheduleDndKey } from '@schedule/dnd/context'
import ShiftChip from '@schedule/ui/ShiftChip/ShiftChip.vue'
import { computed, provide, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    templates: readonly ShiftTemplate[]
    disabled?: boolean
    canDrop: (payload: DragPayload, target: CellRef) => boolean
    getShift?: (payload: DragPayload) => ShiftViewModel | null
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  start: [payload: DragPayload]
  over: [payload: DragPayload, target: CellRef | null]
  drop: [payload: DragPayload, target: CellRef]
  cancel: []
}>()

const scope = useId()
const payload = ref<DragPayload | null>(null)
const target = ref<CellRef | null>(null)
const allowed = computed(() =>
  Boolean(
    payload.value && target.value && !props.disabled && props.canDrop(payload.value, target.value),
  ),
)
let suppressUntil = 0

provide(scheduleDndKey, {
  scope,
  disabled: computed(() => props.disabled),
  payload: computed(() => payload.value),
  target: computed(() => target.value),
  allowed,
  suppressClick: (event) =>
    event.defaultPrevented || payload.value !== null || Date.now() < suppressUntil,
})

const sensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
]

// The default Accessibility plugin mutates role/aria-disabled from draggable state,
// which differs from the enabled gridcell/apply state. Own descriptions preserve both semantics.
const instructionsId = `schedule-dnd-instructions-${scope}`
const instructions =
  'Перетащите шаблон или смену указателем; на сенсорном экране сначала удерживайте. Для назначения шаблона с клавиатуры откройте меню ячейки. Для переноса назначенной смены нажмите Alt и стрелку в её ячейке или выберите «Перенести смену» в меню, перейдите к целевой ячейке стрелками и нажмите Enter. Escape отменяет перенос. Пробел переключает выделение.'
const plugins: NonNullable<DragDropProviderProps['plugins']> = (defaults) =>
  defaults.filter(
    (plugin) => (typeof plugin === 'function' ? plugin : plugin.plugin) !== Accessibility,
  )

const preview = computed<ShiftViewModel | null>(() => {
  const active = payload.value
  if (!active) return null
  if (props.getShift) return props.getShift(active)
  if (active.kind !== 'template') return null
  return props.templates.find((template) => template.id === active.templateId) || null
})

function beforeStart(event: BeforeDragStartEvent): void {
  if (props.disabled || !readPayload(event.operation.source?.data.payload)) event.preventDefault()
}

function start(event: DragStartEvent): void {
  const nextPayload = readPayload(event.operation.source?.data.payload)
  if (!nextPayload) return
  payload.value = nextPayload
  target.value = null
  emit('start', nextPayload)
}

/** Default dnd-kit collisions also include shape overlap; only pointer hits are valid here. */
function pointerHits(drop: Droppable | null, coordinates: { x: number; y: number }): boolean {
  const element = drop?.element
  if (!element || !element.isConnected) return false
  const bounds = element.getBoundingClientRect()
  if (
    coordinates.x < bounds.left ||
    coordinates.x >= bounds.right ||
    coordinates.y < bounds.top ||
    coordinates.y >= bounds.bottom
  )
    return false
  if (typeof element.ownerDocument.elementFromPoint !== 'function') return false
  const hit = element.ownerDocument.elementFromPoint(coordinates.x, coordinates.y)
  return Boolean(hit && element.contains(hit))
}

function updateTarget(event: DragOverEvent | DragMoveEvent): void {
  const nextPayload = payload.value
  if (!nextPayload) return
  const candidate = event.operation.target
  const nextTarget = pointerHits(candidate, event.operation.position.current)
    ? readCell(candidate?.data.cell)
    : null
  if (sameCell(target.value, nextTarget) || (!target.value && !nextTarget)) return
  target.value = nextTarget
  emit('over', nextPayload, nextTarget)
}

function end(event: DragEndEvent): void {
  const currentPayload = payload.value
  const candidate = event.operation.target
  const coordinates =
    typeof PointerEvent !== 'undefined' && event.nativeEvent instanceof PointerEvent
      ? { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
      : event.operation.position.current
  const nextTarget = pointerHits(candidate, coordinates) ? readCell(candidate?.data.cell) : null
  suppressUntil = Date.now() + 200

  if (
    !event.canceled &&
    !props.disabled &&
    currentPayload &&
    nextTarget &&
    props.canDrop(currentPayload, nextTarget)
  ) {
    emit('drop', currentPayload, nextTarget)
  } else {
    emit('cancel')
  }

  payload.value = null
  target.value = null
}
</script>

<template>
  <DragDropProvider
    :sensors="sensors"
    :plugins="plugins"
    @before-drag-start="beforeStart"
    @drag-start="start"
    @drag-over="updateTarget"
    @drag-move="updateTarget"
    @drag-end="end"
  >
    <slot />
    <p :id="instructionsId" :class="$style.live">{{ instructions }}</p>
    <DragOverlay :drop-animation="null">
      <div v-if="payload" :class="$style.preview" aria-hidden="true">
        <ShiftChip v-if="preview" :shift="preview" />
        <span v-else :class="$style.fallback">Перенос смены</span>
      </div>
    </DragOverlay>
    <p :class="$style.live" role="status" aria-live="polite">
      <template v-if="payload && target"
        >{{ allowed ? 'Можно назначить смену' : 'Назначение в эту ячейку недоступно' }} ·
        {{ target.workDate }}</template
      >
      <template v-else-if="payload"
        >Перенос смены. Выберите ячейку; Escape отменяет перенос.</template
      >
    </p>
  </DragDropProvider>
</template>

<style module lang="scss">
/* Drag preview shadow and live feedback are implementation states, not inspected Figma tokens. */
.preview {
  min-inline-size: 98px;
  max-inline-size: 240px;
  padding: 4px;
  border: 1px solid var(--schedule-color-border-selected);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-surface-primary);
  box-shadow: 0 8px 24px rgb(16 16 18 / 0.15);
  pointer-events: none;
}
.fallback {
  display: block;
  padding: 12px;
  font-size: var(--schedule-font-size-small);
}
.live {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
