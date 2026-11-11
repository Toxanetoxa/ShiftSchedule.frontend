<script setup lang="ts">
import type {
  CalendarView,
  CellKey,
  CellRef,
  GridDragState,
  IsoDate,
  ScheduleDate,
  ScheduleRow,
} from '@schedule/domain/types'
import { rectangleSelection } from '@schedule/domain/selection'
import { cellKey } from '@schedule/domain/types'
import CoverageRow from '@schedule/ui/CoverageRow/CoverageRow.vue'
import EmployeeRowHeader from '@schedule/ui/EmployeeRowHeader/EmployeeRowHeader.vue'
import ScheduleCell from '@schedule/ui/ScheduleCell/ScheduleCell.vue'
import ScheduleDateHeader from '@schedule/ui/ScheduleDateHeader/ScheduleDateHeader.vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    rows: readonly ScheduleRow[]
    dates: readonly ScheduleDate[]
    view?: CalendarView
    selectedKeys?: readonly CellKey[]
    activeKey?: CellKey | null
    disabled?: boolean
    loading?: boolean
    searchActive?: boolean
    dragState?: GridDragState
    dragEnabled?: boolean
    moveSource?: CellRef | null
    coverageCounts?: Readonly<Record<IsoDate, number>>
  }>(),
  {
    view: 'week',
    selectedKeys: () => [],
    disabled: false,
    loading: false,
    searchActive: false,
    dragEnabled: false,
  },
)

const emit = defineEmits<{
  focusCell: [cell: CellRef]
  activateCell: [cell: CellRef, event: MouseEvent | KeyboardEvent]
  changeSelection: [keys: CellKey[]]
  requestMove: [cell: CellRef]
  requestDateAction: [date: IsoDate]
  openCellActions: [cell: CellRef, event: MouseEvent | KeyboardEvent]
  clearCells: [cells: CellRef[]]
  cancelMove: []
}>()

const root = ref<HTMLElement | null>(null)
const helpId = useId()
const focusedKey = ref<CellKey | null>(props.activeKey || null)
const anchor = ref<CellRef | null>(null)
const employeeIds = computed(() => props.rows.map((row) => row.employee.id))
const dateIds = computed(() => props.dates.map((date) => date.date))
const cells = computed(() =>
  props.rows.flatMap((row) =>
    props.dates.map((date) => ({ employeeId: row.employee.id, workDate: date.date })),
  ),
)
const visibleKeys = computed(() => cells.value.map(cellKey))
const selected = computed(() => new Set(props.selectedKeys))
const currentKey = computed(() =>
  focusedKey.value && visibleKeys.value.includes(focusedKey.value)
    ? focusedKey.value
    : visibleKeys.value[0],
)
const counts = computed(
  () =>
    props.coverageCounts ||
    Object.fromEntries(
      props.dates.map((date) => [
        date.date,
        props.rows.filter((row) => row.cells[date.date]).length,
      ]),
    ),
)
const columns = computed(
  () =>
    `var(--schedule-employee-column-width) repeat(${props.dates.length}, ${props.view === 'month' ? 'var(--schedule-month-cell-width)' : 'minmax(var(--schedule-week-cell-min-width), 1fr)'})`,
)

watch(
  () => props.activeKey,
  (key) => {
    focusedKey.value = key || null
  },
)
watch(
  () => visibleKeys.value.join('|'),
  (value, previous) => {
    if (value !== previous) {
      anchor.value = null
      if (props.selectedKeys.length) emit('changeSelection', [])
    }
  },
)

function focusCell(cell: CellRef): void {
  focusedKey.value = cellKey(cell)
  emit('focusCell', cell)
}

async function moveFocus(cell: CellRef): Promise<void> {
  focusCell(cell)
  await nextTick()
  const element = Array.from(
    root.value?.querySelectorAll<HTMLElement>('[data-cell-key]') || [],
  ).find((node) => node.dataset.cellKey === cellKey(cell))
  element?.focus()
  element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

function activate(cell: CellRef, event: MouseEvent | KeyboardEvent): void {
  if (props.disabled) return
  focusCell(cell)
  if (props.moveSource) {
    emit('activateCell', cell, event)
    return
  }
  if (event instanceof KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) emit('requestDateAction', cell.workDate)
    else emit('activateCell', cell, event)
    return
  }
  if (event.shiftKey && anchor.value) {
    emit(
      'changeSelection',
      rectangleSelection(employeeIds.value, dateIds.value, anchor.value, cell),
    )
  } else {
    toggle(cell)
  }
}

function toggle(cell: CellRef): void {
  if (props.disabled) return
  const keys = new Set(props.selectedKeys.filter((key) => visibleKeys.value.includes(key)))
  const key = cellKey(cell)
  if (keys.has(key)) keys.delete(key)
  else keys.add(key)
  anchor.value = cell
  emit('changeSelection', [...keys])
}

function keydown(cell: CellRef, event: KeyboardEvent): void {
  if (props.disabled || event.altKey || event.defaultPrevented) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.closest('input,textarea,select,[contenteditable="true"]')
  )
    return
  if (event.key === 'Escape') {
    emit('cancelMove')
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    emit(
      'clearCells',
      cells.value.filter((item) => selected.value.has(cellKey(item))),
    )
    return
  }

  let row = employeeIds.value.indexOf(cell.employeeId)
  let column = dateIds.value.indexOf(cell.workDate)
  switch (event.key) {
    case 'ArrowLeft':
      column--
      break
    case 'ArrowRight':
      column++
      break
    case 'ArrowUp':
      row--
      break
    case 'ArrowDown':
      row++
      break
    case 'Home':
      column = 0
      if (event.ctrlKey || event.metaKey) row = 0
      break
    case 'End':
      column = props.dates.length - 1
      if (event.ctrlKey || event.metaKey) row = props.rows.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  row = Math.max(0, Math.min(row, props.rows.length - 1))
  column = Math.max(0, Math.min(column, props.dates.length - 1))
  const next = { employeeId: employeeIds.value[row]!, workDate: dateIds.value[column]! }
  if (event.shiftKey) {
    anchor.value ||= cell
    emit(
      'changeSelection',
      rectangleSelection(employeeIds.value, dateIds.value, anchor.value, next),
    )
  } else anchor.value = next
  void moveFocus(next)
}
defineExpose({ focusCell: moveFocus })
</script>

<template>
  <div
    ref="root"
    :class="$style.grid"
    role="grid"
    aria-label="График сотрудников"
    aria-multiselectable="true"
    :aria-busy="loading"
    :aria-disabled="disabled || undefined"
    :aria-describedby="helpId"
    :aria-colcount="dates.length + 1"
    :aria-rowcount="loading || !rows.length || !dates.length ? 2 : rows.length + 2"
    :data-view="view"
    :tabindex="!rows.length || !dates.length || loading || disabled ? 0 : undefined"
    :style="{ '--calendar-columns': columns }"
  >
    <p :id="helpId" :class="$style.srOnly">
      Клик выделяет ячейку, повторный клик снимает её выделение. Стрелки перемещают фокус. Пробел
      переключает выделение, Shift со стрелками расширяет его. Enter открывает ячейку, Ctrl+Enter —
      действия даты. Delete очищает выделенные ячейки.
      <template v-if="dragEnabled"
        >Alt со стрелкой начинает перенос смены; выберите цель стрелками и нажмите Enter. Escape
        отменяет перенос.</template
      >
    </p>
    <div :class="[$style.row, $style.head]" role="row">
      <div :class="$style.corner" role="columnheader">Сотрудники</div>
      <ScheduleDateHeader
        v-for="date in dates"
        :key="date.date"
        v-bind="date"
        :covered="(counts[date.date] || 0) > 0"
        :disabled="disabled || loading"
        :tab-index="-1"
        @open-date-actions="emit('requestDateAction', date.date)"
      />
    </div>
    <div v-if="loading" :class="$style.empty" role="row">
      <div role="gridcell">Загружаем график…</div>
    </div>
    <div v-else-if="!dates.length" :class="$style.empty" role="row">
      <div role="gridcell">В выбранном диапазоне нет дат.</div>
    </div>
    <div v-else-if="!rows.length" :class="$style.empty" role="row">
      <div role="gridcell">
        {{
          searchActive
            ? 'Сотрудники не найдены. Измените поисковый запрос.'
            : 'В графике пока нет сотрудников.'
        }}
      </div>
    </div>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row.employee.id"
        :class="[$style.row, $style.bodyRow]"
        role="row"
      >
        <div :class="$style.employee">
          <EmployeeRowHeader :employee="row.employee" :scheduled-minutes="row.scheduledMinutes" />
        </div>
        <ScheduleCell
          v-for="date in dates"
          :key="date.date"
          :cell="{ employeeId: row.employee.id, workDate: date.date }"
          :employee-name="row.employee.name"
          :data-cell-key="cellKey({ employeeId: row.employee.id, workDate: date.date })"
          :shift="row.cells[date.date] || null"
          :view="view"
          :disabled="disabled"
          :drag-enabled="dragEnabled"
          :keyboard-active="
            currentKey === cellKey({ employeeId: row.employee.id, workDate: date.date })
          "
          :selected="selected.has(cellKey({ employeeId: row.employee.id, workDate: date.date }))"
          :dirty="row.dirtyDates?.includes(date.date) || false"
          :conflict="row.conflictDates?.includes(date.date) || false"
          :drop-state="
            dragState?.target?.employeeId === row.employee.id &&
            dragState.target.workDate === date.date
              ? dragState.allowed
                ? 'allowed'
                : 'blocked'
              : 'none'
          "
          @focus="focusCell({ employeeId: row.employee.id, workDate: date.date })"
          @activate="activate({ employeeId: row.employee.id, workDate: date.date }, $event)"
          @toggle-selection="toggle({ employeeId: row.employee.id, workDate: date.date })"
          @request-move="emit('requestMove', { employeeId: row.employee.id, workDate: date.date })"
          @open-actions="
            emit('openCellActions', { employeeId: row.employee.id, workDate: date.date }, $event)
          "
          @keydown="keydown({ employeeId: row.employee.id, workDate: date.date }, $event)"
        />
      </div>
      <CoverageRow :dates="[...dates]" :counts="counts" sticky />
    </template>
  </div>
</template>

<style module lang="scss">
.grid {
  min-width: 0;
  overflow: auto;
  isolation: isolate;
  scroll-padding-inline-start: var(--schedule-employee-column-width);
  scroll-padding-block-start: var(--schedule-header-height);
  scroll-padding-block-end: var(--schedule-coverage-row-min-height);
  background: var(--schedule-color-surface-primary);
  border-radius: var(--schedule-calendar-radius);
}
.row {
  display: grid;
  grid-template-columns: var(--calendar-columns);
  min-width: max-content;
}
.head {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--schedule-color-surface-primary);

  &::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    z-index: 3;
    block-size: var(--schedule-grid-line-width);
    background: var(--schedule-grid-line-color);
    pointer-events: none;
  }
}
.bodyRow {
  --row-background: var(--schedule-color-surface-primary);
  background: var(--row-background);
  &:nth-child(odd) {
    --row-background: var(--schedule-color-surface-secondary);
  }
}
.employee,
.corner {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--row-background, var(--schedule-color-surface-primary));
}
.corner {
  display: flex;
  align-items: center;
  padding: 12px;
  font-size: var(--schedule-font-size-small);
  color: var(--schedule-color-label-secondary);
}
.empty {
  padding: 32px;
  color: var(--schedule-color-label-secondary);
}
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
