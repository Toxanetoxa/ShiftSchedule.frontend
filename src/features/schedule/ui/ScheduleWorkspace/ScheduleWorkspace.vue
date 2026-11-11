<script setup lang="ts">
import type { ScheduleOperation } from '@schedule/domain/operations'
import type {
  CalendarView,
  CellKey,
  CellRef,
  DragPayload,
  IsoDate,
  ScheduleRow,
  ShiftInput,
  ShiftViewModel,
} from '@schedule/domain/types'
import { operationErrorMessage } from '@schedule/domain/operationMessages'
import { applyScheduleOperation, dirtyCellKeys } from '@schedule/domain/operations'
import { cellKey } from '@schedule/domain/types'
import { useScheduleTransfers } from '@schedule/model/useScheduleTransfers'
import {
  conflicts,
  customShift,
  emptyRows,
  makeDates,
  templates,
  weekRows,
} from '@schedule/stories/fixtures'
import CellActionPopover from '@schedule/ui/CellActionPopover/CellActionPopover.vue'
import ConfirmReplaceDialog from '@schedule/ui/ConfirmReplaceDialog/ConfirmReplaceDialog.vue'
import ConflictReviewDialog from '@schedule/ui/ConflictReviewDialog/ConflictReviewDialog.vue'
import PeriodNavigator from '@schedule/ui/PeriodNavigator/PeriodNavigator.vue'
import ScheduleDragDrop from '@schedule/ui/ScheduleDragDrop/ScheduleDragDrop.vue'
import ScheduleFeedback from '@schedule/ui/ScheduleFeedback/ScheduleFeedback.vue'
import ScheduleGrid from '@schedule/ui/ScheduleGrid/ScheduleGrid.vue'
import ScheduleHeader from '@schedule/ui/ScheduleHeader/ScheduleHeader.vue'
import ScheduleToolbar from '@schedule/ui/ScheduleToolbar/ScheduleToolbar.vue'
import ShiftTemplateCard from '@schedule/ui/ShiftTemplateCard/ShiftTemplateCard.vue'
import ShiftTemplatePanel from '@schedule/ui/ShiftTemplatePanel/ShiftTemplatePanel.vue'
import TemplatePickerPopover from '@schedule/ui/TemplatePickerPopover/TemplatePickerPopover.vue'
import { AppShell, UiButton, UiDialog } from '@ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    view?: CalendarView
    state?: 'empty' | 'filled'
    selected?: boolean
    inactiveEmployee?: boolean
    scenario?:
      | 'default'
      | 'custom'
      | 'no-results'
      | 'load-error'
      | 'save-error'
      | 'remote-update'
      | 'conflict'
  }>(),
  { view: 'week', state: 'filled', selected: false, inactiveEmployee: false, scenario: 'default' },
)

const view = ref(props.view)
const activeDate = ref<IsoDate>('2026-11-09')
const search = ref(props.scenario === 'no-results' ? 'Несуществующий сотрудник' : '')
const rows = ref<ScheduleRow[]>([])
const baselineRows = ref<ScheduleRow[]>([])
const selectedKeys = ref<CellKey[]>([])
const activeKey = ref<CellKey | null>(null)
const dirtyKeys = ref(new Set<CellKey>())
const drawerOpen = ref(false)
const pickerOpen = ref(false)
const conflictOpen = ref(false)
const conflictResolved = ref(false)
const narrow = ref(false)
const sidebarCollapsed = ref(false)
const message = ref('')
const panelRoot = ref<HTMLElement | null>(null)
const grid = ref<InstanceType<typeof ScheduleGrid> | null>(null)
const actionCell = ref<CellRef | null>(null)
const cellMenuOpen = ref(false)
const error = ref<string | null>(
  props.scenario === 'load-error'
    ? 'Сценарий ошибки загрузки. Запросы к серверу в этой истории не выполняются.'
    : props.scenario === 'save-error'
      ? 'Не удалось сохранить изменения. Локальные смены и выделение сохранены.'
      : null,
)
const remoteUpdated = ref(props.scenario === 'remote-update' || props.scenario === 'conflict')
let stopMedia: (() => void) | undefined

function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`)
}
const dates = computed(() => {
  if (view.value === 'week') {
    const start = calendarDate(activeDate.value)
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
    return makeDates(start.toISOString().slice(0, 10), 7)
  }
  const start = calendarDate(`${activeDate.value.slice(0, 7)}-01`)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return makeDates(
    start.toISOString().slice(0, 10),
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  )
})
const rangeLabel = computed(() => {
  const first = dates.value[0]
  const last = dates.value.at(-1)
  if (!first || !last) return ''
  if (view.value === 'month')
    return new Intl.DateTimeFormat('ru', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(calendarDate(first.date))
  const formatter = new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${formatter.format(calendarDate(first.date))} — ${formatter.format(calendarDate(last.date))}`
})
const allCells = computed(() =>
  rows.value.flatMap((row) =>
    dates.value.map((date) => ({ employeeId: row.employee.id, workDate: date.date })),
  ),
)
const selectedCells = computed(() =>
  allCells.value.filter((cell) => selectedKeys.value.includes(cellKey(cell))),
)
const summary = computed(() => ({
  cellCount: selectedCells.value.length,
  employeeCount: new Set(selectedCells.value.map((cell) => cell.employeeId)).size,
  dayCount: new Set(selectedCells.value.map((cell) => cell.workDate)).size,
}))
const displayRows = computed(() =>
  rows.value.map((row) => ({
    ...row,
    scheduledMinutes: dates.value.reduce(
      (sum, date) => sum + (row.cells[date.date]?.durationMinutes || 0),
      0,
    ),
    dirtyDates: dates.value
      .filter((date) =>
        dirtyKeys.value.has(cellKey({ employeeId: row.employee.id, workDate: date.date })),
      )
      .map((date) => date.date),
    conflictDates:
      props.scenario === 'conflict' &&
      !conflictResolved.value &&
      row.employee.id === conflicts[0]?.cell.employeeId
        ? [conflicts[0].cell.workDate]
        : [],
  })),
)
const filteredRows = computed(() =>
  displayRows.value.filter((row) =>
    row.employee.name.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru')),
  ),
)
const coverageCounts = computed(() =>
  Object.fromEntries(
    dates.value.map((date) => [
      date.date,
      displayRows.value.filter((row) => row.cells[date.date]).length,
    ]),
  ),
)
const blocked = computed(() => props.scenario === 'load-error' && Boolean(error.value))

function refreshDirty(): void {
  dirtyKeys.value = new Set(dirtyCellKeys(baselineRows.value, rows.value))
}

const transfers = useScheduleTransfers({
  rows,
  templates,
  editableDates: () => dates.value.map((date) => date.date),
  disabled: () => blocked.value || conflictOpen.value,
  scope: () => JSON.stringify([view.value, activeDate.value, search.value]),
  onCommit: refreshDirty,
})
const {
  pending: pendingTransfer,
  error: transferError,
  message: transferMessage,
  keyboardSource,
} = transfers
const interactionsDisabled = computed(() => blocked.value || Boolean(pendingTransfer.value))
const replaceSource = computed(() =>
  pendingTransfer.value?.payload.kind === 'assignment'
    ? pendingTransfer.value.payload.source
    : null,
)
const replaceTemplateLabel = computed(() => {
  const payload = pendingTransfer.value?.payload
  return payload?.kind === 'template'
    ? templates.find((item) => item.id === payload.templateId)?.label || ''
    : ''
})
const replaceTarget = computed<CellRef>(
  () => pendingTransfer.value?.target || { employeeId: '', workDate: '' },
)
const employeeName = (id: string): string =>
  rows.value.find((row) => row.employee.id === id)?.employee.name || id
const actionShift = computed(() =>
  actionCell.value
    ? rows.value.find((row) => row.employee.id === actionCell.value!.employeeId)?.cells[
        actionCell.value.workDate
      ] || null
    : null,
)
const keyboardDragState = computed(() => {
  const source = keyboardSource.value
  const target = allCells.value.find((cell) => cellKey(cell) === activeKey.value)
  return source && target
    ? { source, target, allowed: transfers.canDrop({ kind: 'assignment', source }, target) }
    : undefined
})

function startDrag(payload: DragPayload): void {
  message.value = ''
  transfers.start(payload)
}

function drop(payload: DragPayload, target: CellRef): void {
  if (transfers.drop(payload, target)) {
    activeKey.value = cellKey(target)
    void nextTick(() => grid.value?.focusCell(target))
  }
}

function beginMove(cell: CellRef): void {
  message.value = ''
  cellMenuOpen.value = false
  if (transfers.beginMove(cell)) void nextTick(() => grid.value?.focusCell(cell))
}

function activateCell(cell: CellRef): void {
  if (keyboardSource.value) {
    if (transfers.chooseTarget(cell)) activeKey.value = cellKey(cell)
  } else void openEditor(cell)
}

function openCellMenu(cell: CellRef): void {
  if (interactionsDisabled.value) return
  actionCell.value = { ...cell }
  cellMenuOpen.value = true
}

function confirmTransfer(): void {
  const target = pendingTransfer.value?.target
  if (transfers.confirmReplacement() && target) {
    activeKey.value = cellKey(target)
    void nextTick(() => grid.value?.focusCell(target))
  }
}

function execute(command: ScheduleOperation): void {
  if (interactionsDisabled.value) return
  transfers.cancel()
  transferMessage.value = ''
  const result = applyScheduleOperation(
    { rows: rows.value, templates, editableDates: dates.value.map((date) => date.date) },
    command,
    { replaceOccupied: true },
  )
  if (result.status === 'applied') {
    rows.value = result.rows
    refreshDirty()
    error.value = null
    message.value = `Локально изменено ячеек: ${result.changedCells.length}. Изменения пока не отправляются на сервер.`
  } else if (result.status === 'blocked') error.value = operationErrorMessage(result.reason)
}

function initialize(): void {
  transfers.cancel()
  transferMessage.value = ''
  rows.value = (props.state === 'empty' ? emptyRows : weekRows).map((row, index) => ({
    ...row,
    employee: {
      ...row.employee,
      active: props.inactiveEmployee && index === 7 ? false : row.employee.active,
    },
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([date, shift]) => [date, shift ? { ...shift } : null]),
    ),
  }))
  baselineRows.value = rows.value.map((row) => ({ ...row, cells: { ...row.cells } }))
  selectedKeys.value = []
  dirtyKeys.value = new Set()
  if (props.selected) {
    selectedKeys.value = rows.value
      .slice(0, 2)
      .flatMap((row) =>
        dates.value
          .slice(0, 4)
          .map((date) => cellKey({ employeeId: row.employee.id, workDate: date.date })),
      )
  }
  if (
    props.scenario === 'custom' ||
    props.scenario === 'save-error' ||
    props.scenario === 'conflict'
  ) {
    const firstRow = rows.value[0]
    const firstDate = dates.value[0]
    if (firstRow && firstDate) {
      firstRow.cells[firstDate.date] = { ...customShift }
      dirtyKeys.value.add(cellKey({ employeeId: firstRow.employee.id, workDate: firstDate.date }))
    }
  }
}

initialize()
watch(search, () => {
  selectedKeys.value = []
})
watch(view, () => {
  selectedKeys.value = []
  activeKey.value = null
})
watch(
  () => props.view,
  (value) => {
    view.value = value
  },
)
watch(
  () => [props.state, props.selected, props.scenario, props.inactiveEmployee],
  () => {
    search.value = props.scenario === 'no-results' ? 'Несуществующий сотрудник' : ''
    conflictResolved.value = false
    remoteUpdated.value = props.scenario === 'remote-update' || props.scenario === 'conflict'
    error.value =
      props.scenario === 'load-error'
        ? 'Сценарий ошибки загрузки. API не вызывается.'
        : props.scenario === 'save-error'
          ? 'Не удалось сохранить изменения. Локальный черновик сохранён.'
          : null
    initialize()
  },
)

function applyTo(cells: readonly CellRef[], shift: ShiftViewModel | null): void {
  if (!shift) execute({ kind: 'clear', targets: cells })
  else execute({ kind: 'custom', targets: cells, input: shift })
}

function applyTemplate(templateId: string): void {
  const template = templates.find((item) => item.id === templateId)
  if (!template || interactionsDisabled.value) return
  execute({ kind: 'template', templateId, targets: selectedCells.value })
  pickerOpen.value = false
  drawerOpen.value = false
}

function applyCustom(shift: ShiftInput): void {
  execute({ kind: 'custom', targets: selectedCells.value, input: shift })
  drawerOpen.value = false
}

async function openEditor(cell: CellRef): Promise<void> {
  selectedKeys.value = [cellKey(cell)]
  if (narrow.value) drawerOpen.value = true
  else {
    await nextTick()
    panelRoot.value?.querySelector<HTMLInputElement>('input')?.focus()
  }
}

function chooseDate(date: IsoDate): void {
  activeDate.value = date
  selectedKeys.value = []
  activeKey.value = null
}
function movePeriod(direction: number): void {
  const date = calendarDate(activeDate.value)
  if (view.value === 'month') {
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + direction)
  } else date.setUTCDate(date.getUTCDate() + direction * 7)
  chooseDate(date.toISOString().slice(0, 10))
}
function today(): void {
  chooseDate(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date()))
}
function selectDate(date: IsoDate): void {
  selectedKeys.value = filteredRows.value.map((row) =>
    cellKey({ employeeId: row.employee.id, workDate: date }),
  )
  message.value = `Выбраны ячейки даты ${date} для ${filteredRows.value.length} видимых сотрудников. Назначьте шаблон или свою смену.`
}
function clearError(): void {
  error.value = null
  transferError.value = ''
  message.value = 'Сообщение об ошибке закрыто. Сетевой запрос не выполняется.'
}
function confirmConflict(resolution: {
  resolutions: { cell: CellRef; choice: 'local' | 'remote' }[]
}): void {
  resolution.resolutions.forEach((item) => {
    const conflict = conflicts.find((candidate) => cellKey(candidate.cell) === cellKey(item.cell))
    if (conflict) {
      rows.value = rows.value.map((row) =>
        row.employee.id === item.cell.employeeId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [item.cell.workDate]: item.choice === 'local' ? conflict.local : conflict.remote,
              },
            }
          : row,
      )
    }
  })
  conflictResolved.value = true
  conflictOpen.value = false
  remoteUpdated.value = false
  refreshDirty()
  message.value = 'Решения показаны в локальной истории. Серверная версия не изменяется.'
}

onMounted(() => {
  const drawerQuery = window.matchMedia('(max-width: 1099px)')
  const sidebarQuery = window.matchMedia('(max-width: 1439px)')
  const update = (): void => {
    narrow.value = drawerQuery.matches
    sidebarCollapsed.value = sidebarQuery.matches
    if (!narrow.value) drawerOpen.value = false
  }
  update()
  drawerQuery.addEventListener('change', update)
  sidebarQuery.addEventListener('change', update)
  stopMedia = () => {
    drawerQuery.removeEventListener('change', update)
    sidebarQuery.removeEventListener('change', update)
  }
})
onBeforeUnmount(() => stopMedia?.())
</script>

<template>
  <ScheduleDragDrop
    :templates="templates"
    :disabled="interactionsDisabled"
    :can-drop="transfers.canDrop"
    :get-shift="transfers.getShift"
    @start="startDrag"
    @drop="drop"
    @cancel="transfers.cancel"
  >
    <AppShell
      v-model:sidebar-collapsed="sidebarCollapsed"
      @navigate="message = `Storybook: команда перехода в раздел «${$event}».`"
      @notifications="message = 'Storybook: открыть уведомления.'"
    >
      <div :class="$style.screen">
        <ScheduleHeader
          title="График сотрудников"
          :dirty-count="dirtyKeys.size"
          :can-save="!interactionsDisabled && dirtyKeys.size > 0"
          :can-publish="!interactionsDisabled && !remoteUpdated"
          @back="message = 'Storybook: вернуться к списку графиков.'"
          @save="
            message =
              'Получена команда save. В Storybook нет HTTP-записи, локальный черновик остаётся.'
          "
          @publish="
            message = 'Получена команда publish. Storybook не создаёт публикацию на сервере.'
          "
        />
        <p :class="$style.note">
          Перетащите шаблон на дату сотрудника или перенесите назначенную смену. Изменения
          локальные; сохранение и публикация не обращаются к API.
        </p>
        <ScheduleFeedback
          :error="transferError || error"
          :remote-updated="remoteUpdated"
          @retry="clearError"
          @review-conflicts="conflictOpen = true"
        />
        <div v-if="keyboardSource" :class="$style.move" role="status">
          Перенос: {{ employeeName(keyboardSource.employeeId) }} · {{ keyboardSource.workDate }}.
          Выберите целевую ячейку мышью или стрелками и нажмите Enter.
          <UiButton color="neutral" variant="tertiary" size="compact" @click="transfers.cancel"
            >Отменить перенос</UiButton
          >
        </div>
        <div :class="$style.workspace" :data-narrow="narrow">
          <section :class="$style.calendar" aria-label="Календарь смен">
            <ScheduleToolbar
              v-model="search"
              v-model:view="view"
              :selection-summary="summary"
              :disabled="interactionsDisabled"
              @choose-template="pickerOpen = true"
              @clear-cells="applyTo(selectedCells, null)"
              @clear-selection="selectedKeys = []"
            />
            <PeriodNavigator
              :active-date="activeDate"
              :view="view"
              :range-label="rangeLabel"
              :disabled="interactionsDisabled"
              @previous="movePeriod(-1)"
              @next="movePeriod(1)"
              @today="today"
              @choose-date="chooseDate"
            />
            <div v-if="narrow || selectedCells.length" :class="$style.actions">
              <UiButton
                v-if="narrow"
                color="neutral"
                variant="quaternary"
                :disabled="interactionsDisabled"
                @click="drawerOpen = true"
                >Смены и шаблоны</UiButton
              >
              <TemplatePickerPopover
                v-if="selectedCells.length"
                v-model:open="pickerOpen"
                :templates="templates"
                :target-summary="`Выделено ячеек: ${selectedCells.length}`"
                :disabled="interactionsDisabled"
                @select-template="applyTemplate"
                ><template #trigger
                  ><UiButton color="neutral" variant="tertiary" size="compact"
                    >Шаблон для выделения</UiButton
                  ></template
                ></TemplatePickerPopover
              >
            </div>
            <div
              v-if="narrow"
              :class="$style.quickTemplates"
              aria-label="Шаблоны для перетаскивания"
            >
              <ShiftTemplateCard
                v-for="template in templates"
                :key="template.id"
                :class="$style.quickTemplate"
                :template="template"
                drag-enabled
                :apply-disabled="selectedCells.length === 0"
                :disabled="interactionsDisabled"
                @apply="applyTemplate(template.id)"
              />
            </div>
            <CellActionPopover
              v-if="actionCell"
              v-model:open="cellMenuOpen"
              :cell="actionCell"
              :shift="actionShift"
              :templates="templates"
              :disabled="interactionsDisabled"
              @start-move="beginMove(actionCell)"
              @edit-custom="openEditor(actionCell)"
              @clear="applyTo([actionCell], null)"
              @apply-template="
                execute({ kind: 'template', templateId: $event, targets: [actionCell] })
              "
              ><template #trigger
                ><UiButton
                  color="neutral"
                  variant="tertiary"
                  size="compact"
                  :disabled="interactionsDisabled"
                  >Действия ячейки · {{ actionCell.workDate }}</UiButton
                ></template
              ></CellActionPopover
            >
            <ScheduleGrid
              ref="grid"
              :class="$style.grid"
              :rows="blocked ? [] : filteredRows"
              :dates="dates"
              :view="view"
              :coverage-counts="coverageCounts"
              :selected-keys="selectedKeys"
              :active-key="activeKey"
              :disabled="interactionsDisabled"
              :search-active="Boolean(search.trim())"
              drag-enabled
              :move-source="keyboardSource"
              :drag-state="keyboardDragState"
              @change-selection="selectedKeys = $event"
              @focus-cell="activeKey = cellKey($event)"
              @activate-cell="activateCell($event)"
              @open-cell-actions="openCellMenu($event)"
              @request-date-action="selectDate"
              @clear-cells="applyTo($event, null)"
              @request-move="beginMove($event)"
              @cancel-move="transfers.cancel"
            />
          </section>
          <div v-if="!narrow" ref="panelRoot">
            <ShiftTemplatePanel
              :templates="templates"
              :selection-count="selectedCells.length"
              :disabled="interactionsDisabled"
              drag-enabled
              @apply-template="applyTemplate"
              @apply-custom="applyCustom"
            />
          </div>
        </div>
        <p v-if="transferMessage || message" :class="$style.message" role="status">
          {{ transferMessage || message }}
        </p>
      </div>
      <UiDialog
        v-if="narrow"
        v-model:open="drawerOpen"
        variant="drawer"
        title="Смены и шаблоны"
        description="Назначьте смену в выделенные ячейки графика."
      >
        <ShiftTemplatePanel
          :templates="templates"
          :selection-count="selectedCells.length"
          :disabled="interactionsDisabled"
          @apply-template="applyTemplate"
          @apply-custom="applyCustom"
        />
      </UiDialog>
      <ConflictReviewDialog
        v-model:open="conflictOpen"
        :conflicts="scenario === 'conflict' ? conflicts : []"
        :remote-version="12"
        @confirm-rebase="confirmConflict"
      />
      <ConfirmReplaceDialog
        :open="!!pendingTransfer"
        :source="replaceSource"
        :target="replaceTarget"
        :template-label="replaceTemplateLabel"
        :source-label="replaceSource ? employeeName(replaceSource.employeeId) : ''"
        :target-label="employeeName(replaceTarget.employeeId)"
        :error="transferError"
        @confirm="confirmTransfer"
        @cancel="transfers.cancel"
        @update:open="!$event && transfers.cancel()"
      />
    </AppShell>
  </ScheduleDragDrop>
</template>

<style module lang="scss">
@use '@/shared/styles/workspace';

.screen {
  @include workspace.screen;
}
.workspace {
  @include workspace.layout;
}
.calendar {
  @include workspace.calendar;
  .grid {
    max-block-size: min(70vh, 650px);
  }
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--figma-spacing-margin-m);
}
.quickTemplates {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
  .quickTemplate {
    flex: 0 0 200px;
  }
}
.move {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--schedule-color-border-selected);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-coverage-filled-bg);
}
.note,
.message {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}
.message {
  padding: var(--figma-spacing-padding-l);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-surface-primary);
}
</style>
