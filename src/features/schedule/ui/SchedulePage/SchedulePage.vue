<script setup lang="ts">
import type { ScheduleOperation } from '@schedule/domain/operations'
import type {
  CalendarView,
  CellKey,
  CellRef,
  DateRange,
  DragPayload,
  IsoDate,
  ShiftInput,
} from '@schedule/domain/types'
import { configuredScheduleId } from '@schedule/api/api'
import { adjacentPeriod, todayInZone } from '@schedule/domain/calendar'
import { operationErrorMessage } from '@schedule/domain/operationMessages'
import { applyScheduleOperation } from '@schedule/domain/operations'
import { cellKey } from '@schedule/domain/types'
import { useScheduleTransfers } from '@schedule/model/useScheduleTransfers'
import { useScheduleWorkspace } from '@schedule/model/useScheduleWorkspace'
import CellActionPopover from '@schedule/ui/CellActionPopover/CellActionPopover.vue'
import ConfirmReplaceDialog from '@schedule/ui/ConfirmReplaceDialog/ConfirmReplaceDialog.vue'
import ConflictReviewDialog from '@schedule/ui/ConflictReviewDialog/ConflictReviewDialog.vue'
import DateActionPopover from '@schedule/ui/DateActionPopover/DateActionPopover.vue'
import PeriodNavigator from '@schedule/ui/PeriodNavigator/PeriodNavigator.vue'
import PublicationView from '@schedule/ui/PublicationView/PublicationView.vue'
import PublishDialog from '@schedule/ui/PublishDialog/PublishDialog.vue'
import ScheduleDragDrop from '@schedule/ui/ScheduleDragDrop/ScheduleDragDrop.vue'
import ScheduleFeedback from '@schedule/ui/ScheduleFeedback/ScheduleFeedback.vue'
import ScheduleGrid from '@schedule/ui/ScheduleGrid/ScheduleGrid.vue'
import ScheduleHeader from '@schedule/ui/ScheduleHeader/ScheduleHeader.vue'
import ScheduleToolbar from '@schedule/ui/ScheduleToolbar/ScheduleToolbar.vue'
import ShiftTemplateCard from '@schedule/ui/ShiftTemplateCard/ShiftTemplateCard.vue'
import ShiftTemplatePanel from '@schedule/ui/ShiftTemplatePanel/ShiftTemplatePanel.vue'
import TemplatePickerPopover from '@schedule/ui/TemplatePickerPopover/TemplatePickerPopover.vue'
import UnsavedChangesDialog from '@schedule/ui/UnsavedChangesDialog/UnsavedChangesDialog.vue'
import { AppShell, UiButton, UiDialog, UiIcon } from '@ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const workspace = useScheduleWorkspace()
const {
  view,
  activeDate,
  currentPage,
  dates,
  rangeLabel,
  title,
  templates,
  rows,
  dirtyKeys,
  conflicts,
  remoteUpdated,
  remoteVersion,
  saveVersion,
  isLoading,
  isFetching,
  loadError,
  error,
  message,
  updatedAt,
  busy,
  saving,
  publishing,
  offline,
  canEdit,
  canSave,
  canPublish,
  latestPublication,
  reviewOpen,
  unsavedOpen,
  defaultPublicationRange,
} = workspace

const search = ref('')
const selectedKeys = ref<CellKey[]>([])
const activeKey = ref<CellKey | null>(null)
const drawerOpen = ref(false)
const pickerOpen = ref(false)
const publishOpen = ref(false)
const notificationOpen = ref(false)
const publicationId = ref<string | null>(null)
const publicationRange = ref<DateRange>({ ...defaultPublicationRange.value })
const narrow = ref(false)
const sidebarCollapsed = ref(false)
const uiMessage = ref('')
const uiError = ref('')
const actionCell = ref<CellRef | null>(null)
const cellMenuOpen = ref(false)
const actionDate = ref<IsoDate | null>(null)
const dateMenuOpen = ref(false)
const grid = ref<InstanceType<typeof ScheduleGrid> | null>(null)
const panelRoot = ref<HTMLElement | null>(null)
let stopMedia: (() => void) | undefined

function text(value: unknown): string {
  return typeof value === 'string' ? value : value instanceof Error ? value.message : ''
}

const allCells = computed(() =>
  rows.value.flatMap((row) =>
    dates.value.map((date) => ({ employeeId: row.employee.id, workDate: date.date })),
  ),
)
const dirtySet = computed(() => new Set(dirtyKeys.value))
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
        dirtySet.value.has(cellKey({ employeeId: row.employee.id, workDate: date.date })),
      )
      .map((date) => date.date),
    conflictDates: conflicts.value
      .filter((conflict) => conflict.cell.employeeId === row.employee.id)
      .map((conflict) => conflict.cell.workDate),
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
const editorLocked = computed(
  () =>
    !canEdit.value ||
    reviewOpen.value ||
    unsavedOpen.value ||
    publishOpen.value ||
    Boolean(publicationId.value) ||
    currentPage.value !== 'schedule',
)
const transfers = useScheduleTransfers({
  rows,
  templates,
  editableDates: () => dates.value.map((date) => date.date),
  disabled: editorLocked,
  scope: () => JSON.stringify([currentPage.value, view.value, activeDate.value, search.value]),
})
const {
  pending: pendingTransfer,
  keyboardSource,
  error: transferError,
  message: transferMessage,
} = transfers
const interactionsDisabled = computed(() => editorLocked.value || Boolean(pendingTransfer.value))
const feedbackError = computed(
  () => transferError.value || uiError.value || text(error.value) || text(loadError.value) || null,
)
const liveMessage = computed(() => transferMessage.value || uiMessage.value || text(message.value))
const replaceSource = computed(() =>
  pendingTransfer.value?.payload.kind === 'assignment'
    ? pendingTransfer.value.payload.source
    : null,
)
const replaceTarget = computed<CellRef>(
  () => pendingTransfer.value?.target || { employeeId: '', workDate: '' },
)
const replaceTemplateLabel = computed(() => {
  const payload = pendingTransfer.value?.payload
  return payload?.kind === 'template'
    ? templates.value.find((template) => template.id === payload.templateId)?.label || ''
    : ''
})
const actionShift = computed(() => {
  const cell = actionCell.value
  return cell
    ? rows.value.find((row) => row.employee.id === cell.employeeId)?.cells[cell.workDate] || null
    : null
})
const keyboardDragState = computed(() => {
  const source = keyboardSource.value
  const target = allCells.value.find((cell) => cellKey(cell) === activeKey.value)
  return source && target
    ? { source, target, allowed: transfers.canDrop({ kind: 'assignment', source }, target) }
    : undefined
})
const publicationOpen = computed({
  get: () => Boolean(publicationId.value),
  set: (value) => {
    if (!value) closePublication()
  },
})
const assignmentCount = computed(() =>
  rows.value.reduce(
    (sum, row) => sum + dates.value.filter((date) => Boolean(row.cells[date.date])).length,
    0,
  ),
)

function employeeName(id: string): string {
  return rows.value.find((row) => row.employee.id === id)?.employee.name || id
}
function execute(command: ScheduleOperation): void {
  if (interactionsDisabled.value) return
  transfers.cancel()
  transferMessage.value = ''
  uiError.value = ''
  const result = applyScheduleOperation(
    {
      rows: rows.value,
      templates: templates.value,
      editableDates: dates.value.map((date) => date.date),
    },
    command,
    { replaceOccupied: true },
  )
  if (result.status === 'applied') {
    rows.value = result.rows
    error.value = ''
    uiMessage.value = `Изменено ячеек: ${result.changedCells.length}. Сохраните график, чтобы отправить изменения.`
  } else if (result.status === 'blocked') uiError.value = operationErrorMessage(result.reason)
}
function applyTemplate(templateId: string): void {
  execute({ kind: 'template', templateId, targets: selectedCells.value })
  pickerOpen.value = false
  drawerOpen.value = false
}
function applyCustom(input: ShiftInput): void {
  execute({ kind: 'custom', input, targets: selectedCells.value })
  drawerOpen.value = false
}
function startDrag(payload: DragPayload): void {
  uiMessage.value = ''
  transfers.start(payload)
}
function drop(payload: DragPayload, target: CellRef): void {
  if (transfers.drop(payload, target)) {
    activeKey.value = cellKey(target)
    void nextTick(() => grid.value?.focusCell(target))
  }
}
function beginMove(cell: CellRef): void {
  cellMenuOpen.value = false
  uiMessage.value = ''
  if (transfers.beginMove(cell)) void nextTick(() => grid.value?.focusCell(cell))
}
function activateCell(cell: CellRef): void {
  if (keyboardSource.value) {
    if (transfers.chooseTarget(cell)) activeKey.value = cellKey(cell)
  } else void openEditor(cell)
}
function cancelTransfer(): void {
  const source = keyboardSource.value || replaceSource.value
  transfers.cancel()
  if (source) void nextTick(() => grid.value?.focusCell(source))
}
function confirmTransfer(): void {
  const target = pendingTransfer.value?.target
  if (transfers.confirmReplacement() && target) {
    activeKey.value = cellKey(target)
    void nextTick(() => grid.value?.focusCell(target))
  }
}
async function openEditor(cell: CellRef): Promise<void> {
  if (interactionsDisabled.value) return
  cellMenuOpen.value = false
  selectedKeys.value = [cellKey(cell)]
  if (narrow.value) drawerOpen.value = true
  else {
    await nextTick()
    panelRoot.value?.querySelector<HTMLInputElement>('input')?.focus()
  }
}
function openCellMenu(cell: CellRef): void {
  if (interactionsDisabled.value) return
  actionCell.value = { ...cell }
  cellMenuOpen.value = true
}
function openDateMenu(date: IsoDate): void {
  if (interactionsDisabled.value) return
  actionDate.value = date
  dateMenuOpen.value = true
}
function dateTargets(): CellRef[] {
  const date = actionDate.value
  return date
    ? filteredRows.value.map((row) => ({ employeeId: row.employee.id, workDate: date }))
    : []
}
function changePeriod(nextView: CalendarView, date: IsoDate): void {
  if (interactionsDisabled.value) return
  workspace.requestPeriod(nextView, date)
}
function movePeriod(direction: number): void {
  changePeriod(view.value, adjacentPeriod(view.value, activeDate.value, direction))
}
function today(): void {
  changePeriod(view.value, todayInZone())
}
function navigate(item: string): void {
  if (busy.value) return
  transfers.cancel()
  transferMessage.value = ''
  workspace.navigate(item === 'home' ? 'home' : 'schedule')
}
async function retry(): Promise<void> {
  uiError.value = ''
  transferError.value = ''
  await workspace.retry()
}
function openPublish(): void {
  if (!canPublish.value || pendingTransfer.value) return
  publicationRange.value = { ...defaultPublicationRange.value }
  publishOpen.value = true
}
function cancelPublish(): void {
  if (!busy.value) {
    publishOpen.value = false
    workspace.cancelPublication()
  }
}
async function confirmPublish(range: DateRange): Promise<void> {
  if (await workspace.publish(range)) {
    const id = latestPublication.value?.id
    publishOpen.value = false
    await nextTick()
    if (id) openPublication(id)
  }
}
function openPublication(id: string): void {
  publicationId.value = id
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  hash.set('publication', id)
  url.hash = hash.toString()
  window.history.replaceState(window.history.state, '', url)
}
function closePublication(): void {
  publicationId.value = null
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  hash.delete('publication')
  url.hash = hash.toString()
  window.history.replaceState(window.history.state, '', url)
}
function readPublicationHash(): void {
  const id = new URLSearchParams(window.location.hash.slice(1)).get('publication')
  publicationId.value =
    id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null
}

watch(search, () => {
  selectedKeys.value = []
  cellMenuOpen.value = false
  dateMenuOpen.value = false
  actionCell.value = null
  actionDate.value = null
  pickerOpen.value = false
})
watch(selectedCells, (cells) => {
  if (!cells.length) pickerOpen.value = false
})
watch(
  () => [view.value, activeDate.value, currentPage.value],
  () => {
    selectedKeys.value = []
    activeKey.value = null
    drawerOpen.value = false
    cellMenuOpen.value = false
    dateMenuOpen.value = false
    uiMessage.value = ''
    actionCell.value = null
    actionDate.value = null
    pickerOpen.value = false
  },
)
watch(message, (value) => {
  if (value) {
    uiMessage.value = ''
    transferMessage.value = ''
  }
})
watch(defaultPublicationRange, (range) => {
  if (!publishOpen.value) publicationRange.value = { ...range }
})
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
  readPublicationHash()
  window.addEventListener('hashchange', readPublicationHash)
  window.addEventListener('popstate', readPublicationHash)
})
onBeforeUnmount(() => {
  stopMedia?.()
  window.removeEventListener('hashchange', readPublicationHash)
  window.removeEventListener('popstate', readPublicationHash)
})
</script>

<template>
  <ScheduleDragDrop
    :templates="templates"
    :disabled="interactionsDisabled"
    :can-drop="transfers.canDrop"
    :get-shift="transfers.getShift"
    @start="startDrag"
    @drop="drop"
    @cancel="cancelTransfer"
  >
    <AppShell
      v-model:sidebar-collapsed="sidebarCollapsed"
      :active-item="currentPage === 'home' ? 'home' : 'shifts'"
      @navigate="navigate"
      @notifications="notificationOpen = true"
    >
      <div v-if="currentPage === 'home'" :class="[$style.screen, $style.home]">
        <header>
          <h1>Главная</h1>
          <p :class="$style.muted">Управляйте рабочим графиком сотрудников.</p>
        </header>
        <ScheduleFeedback
          :loading="isLoading"
          :error="feedbackError"
          :offline="offline"
          @retry="retry"
        />
        <section :class="$style.card" aria-labelledby="schedule-card-title">
          <div>
            <h2 id="schedule-card-title">{{ title }}</h2>
            <p :class="$style.muted">{{ rangeLabel }}</p>
          </div>
          <dl>
            <div>
              <dt>Сотрудников</dt>
              <dd>{{ isLoading ? '…' : rows.length }}</dd>
            </div>
            <div>
              <dt>Назначено смен</dt>
              <dd>{{ isLoading ? '…' : assignmentCount }}</dd>
            </div>
            <div>
              <dt>Несохранённых изменений</dt>
              <dd>{{ dirtySet.size }}</dd>
            </div>
          </dl>
          <div :class="$style.actions">
            <UiButton
              :disabled="isLoading || busy || (Boolean(loadError) && !rows.length)"
              @click="navigate('shifts')"
              >Открыть график</UiButton
            ><UiButton
              v-if="latestPublication"
              color="neutral"
              variant="tertiary"
              @click="openPublication(latestPublication.id)"
              >Последняя публикация</UiButton
            >
          </div>
        </section>
      </div>
      <div v-else :class="$style.screen">
        <ScheduleHeader
          :title="title"
          :dirty-count="dirtySet.size"
          :saving="saving"
          :publishing="publishing"
          :updated-at="updatedAt"
          :can-save="canSave && !pendingTransfer && !keyboardSource"
          :can-publish="canPublish && !pendingTransfer && !keyboardSource"
          @back="navigate('home')"
          @save="workspace.save()"
          @publish="openPublish"
        />
        <ScheduleFeedback
          :error="feedbackError"
          :offline="offline"
          :remote-updated="remoteUpdated"
          @retry="retry"
          @review-conflicts="workspace.review()"
        />
        <div v-if="latestPublication" :class="$style.publication">
          <span>Опубликована версия {{ latestPublication.sourceVersion }}</span
          ><UiButton
            color="neutral"
            variant="tertiary"
            size="compact"
            @click="openPublication(latestPublication.id)"
            >Открыть публикацию</UiButton
          >
        </div>
        <div v-if="keyboardSource" :class="$style.move" role="status">
          Перенос: {{ employeeName(keyboardSource.employeeId) }} · {{ keyboardSource.workDate }}.
          Перейдите к целевой ячейке стрелками и нажмите Enter.<UiButton
            color="neutral"
            variant="tertiary"
            size="compact"
            @click="cancelTransfer"
            >Отменить перенос</UiButton
          >
        </div>
        <div :class="$style.workspace" :data-narrow="narrow">
          <section :class="$style.calendar" aria-label="Календарь смен">
            <ScheduleToolbar
              v-model="search"
              :view="view"
              :selection-summary="summary"
              :disabled="interactionsDisabled"
              @update:view="changePeriod($event, activeDate)"
              @clear-search="search = ''"
              @clear-cells="execute({ kind: 'clear', targets: selectedCells })"
              @clear-selection="selectedKeys = []"
            >
              <template #template-action>
                <TemplatePickerPopover
                  v-model:open="pickerOpen"
                  :templates="templates"
                  :target-summary="`Выделено ячеек: ${selectedCells.length}`"
                  :disabled="interactionsDisabled || !selectedCells.length"
                  @select-template="applyTemplate"
                >
                  <template #trigger>
                    <UiButton
                      color="neutral"
                      variant="quinary"
                      size="compact"
                      :disabled="interactionsDisabled || !selectedCells.length"
                      ><template #leading><UiIcon name="plus" /></template>Поставить
                      шаблон</UiButton
                    >
                  </template>
                </TemplatePickerPopover>
              </template>
            </ScheduleToolbar>
            <PeriodNavigator
              :active-date="activeDate"
              :view="view"
              :range-label="rangeLabel"
              :disabled="interactionsDisabled"
              @previous="movePeriod(-1)"
              @next="movePeriod(1)"
              @today="today"
              @choose-date="changePeriod(view, $event)"
            />
            <div v-if="narrow" :class="$style.actions">
              <UiButton
                color="neutral"
                variant="quaternary"
                :disabled="interactionsDisabled"
                @click="drawerOpen = true"
                >Смены и шаблоны</UiButton
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
              @clear="execute({ kind: 'clear', targets: [actionCell] })"
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
            <DateActionPopover
              v-if="actionDate"
              v-model:open="dateMenuOpen"
              :date="actionDate"
              :visible-employee-count="filteredRows.length"
              :templates="templates"
              :disabled="interactionsDisabled"
              @select-date-cells="selectedKeys = dateTargets().map(cellKey)"
              @apply-template="
                execute({ kind: 'template', templateId: $event, targets: dateTargets() })
              "
              ><template #trigger
                ><UiButton
                  color="neutral"
                  variant="tertiary"
                  size="compact"
                  :disabled="interactionsDisabled"
                  >Действия даты · {{ actionDate }}</UiButton
                ></template
              ></DateActionPopover
            >
            <div v-if="loadError && !rows.length" :class="$style.loadError" role="alert">
              <p>Не удалось загрузить график.</p>
              <UiButton :loading="isFetching" @click="retry">Повторить загрузку</UiButton>
            </div>
            <ScheduleGrid
              v-else
              ref="grid"
              :class="$style.grid"
              :rows="filteredRows"
              :dates="dates"
              :view="view"
              :coverage-counts="coverageCounts"
              :selected-keys="selectedKeys"
              :active-key="activeKey"
              :disabled="interactionsDisabled"
              :loading="isLoading"
              :search-active="Boolean(search.trim())"
              drag-enabled
              :move-source="keyboardSource"
              :drag-state="keyboardDragState"
              @change-selection="selectedKeys = $event"
              @focus-cell="activeKey = cellKey($event)"
              @activate-cell="activateCell"
              @open-cell-actions="openCellMenu"
              @request-date-action="openDateMenu"
              @clear-cells="execute({ kind: 'clear', targets: $event })"
              @request-move="beginMove"
              @cancel-move="cancelTransfer"
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
        <p :class="$style.message" role="status">{{ liveMessage }}</p>
      </div>
      <UiDialog
        v-model:open="notificationOpen"
        title="Уведомления"
        description="Уведомления о событиях графика"
        ><p>Уведомлений пока нет.</p></UiDialog
      >
      <PublishDialog
        :open="publishOpen"
        :range="publicationRange"
        :has-dirty="dirtySet.size > 0"
        :pending="busy"
        :error="text(error) || null"
        @update:open="!$event && cancelPublish()"
        @update:range="publicationRange = $event"
        @confirm="confirmPublish"
        @cancel="cancelPublish"
      />
      <UnsavedChangesDialog
        :open="unsavedOpen"
        :pending="busy"
        :error="text(error) || null"
        @save-and-continue="workspace.saveAndContinue()"
        @discard-and-continue="workspace.discardAndContinue()"
        @stay="workspace.cancelTransition()"
      />
      <ConflictReviewDialog
        v-model:open="reviewOpen"
        :conflicts="conflicts"
        :remote-version="remoteVersion || saveVersion || 1"
        :pending="busy"
        :error="text(error) || null"
        @confirm-rebase="workspace.confirmRebase($event)"
      />
      <ConfirmReplaceDialog
        :open="Boolean(pendingTransfer)"
        :source="replaceSource"
        :target="replaceTarget"
        :template-label="replaceTemplateLabel"
        :source-label="replaceSource ? employeeName(replaceSource.employeeId) : ''"
        :target-label="employeeName(replaceTarget.employeeId)"
        :pending="busy"
        :error="transferError"
        @confirm="confirmTransfer"
        @cancel="cancelTransfer"
      />
    </AppShell>
  </ScheduleDragDrop>
  <UiDialog
    v-if="narrow"
    v-model:open="drawerOpen"
    variant="drawer"
    title="Смены и шаблоны"
    description="Назначьте смену в выделенные ячейки графика."
    :pending="busy"
    ><ShiftTemplatePanel
      :templates="templates"
      :selection-count="selectedCells.length"
      :disabled="interactionsDisabled"
      @apply-template="applyTemplate"
      @apply-custom="applyCustom"
  /></UiDialog>
  <UiDialog
    v-model:open="publicationOpen"
    title="Опубликованный график"
    description="Зафиксированный снимок, доступный только для чтения."
    variant="wide"
    ><PublicationView
      v-if="publicationId"
      :key="publicationId"
      :schedule-id="configuredScheduleId"
      :publication-id="publicationId"
  /></UiDialog>
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
.actions,
.publication {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--figma-spacing-margin-m);
}
.publication {
  padding: var(--figma-spacing-padding-l);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-surface-primary);
}
.quickTemplates {
  display: flex;
  gap: var(--figma-spacing-margin-m);
  overflow-x: auto;
  padding: var(--figma-spacing-margin-s);
  .quickTemplate {
    flex: 0 0 200px;
  }
}
.move {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--figma-spacing-padding-l);
  padding: var(--figma-spacing-padding-l);
  border: 1px solid var(--schedule-color-border-selected);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-coverage-filled-bg);
}
.message {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.muted {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
}
.loadError {
  display: grid;
  justify-items: start;
  gap: var(--figma-spacing-padding-xl);
  padding: var(--figma-spacing-padding-2xl);
}
.home {
  header {
    display: grid;
    gap: var(--figma-spacing-padding-l);
  }
  h1 {
    margin: 0;
    font-size: var(--schedule-font-size-title);
    line-height: var(--schedule-line-height-title);
    font-weight: var(--schedule-font-weight-title);
    letter-spacing: var(--schedule-tracking-title);
  }
}
.card {
  display: grid;
  gap: var(--figma-spacing-padding-2xl);
  padding: var(--figma-spacing-padding-2xl);
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--figma-radius-2xl);
  background: var(--schedule-color-surface-primary);
  h2 {
    margin: 0 0 var(--figma-spacing-margin-m);
    font-size: 20px;
    font-weight: var(--schedule-font-weight-semibold);
  }
  dl {
    display: flex;
    flex-wrap: wrap;
    gap: var(--figma-spacing-padding-2xl);
    margin: 0;
  }
  dt {
    color: var(--schedule-color-label-secondary);
    font-size: var(--schedule-font-size-small);
  }
  dd {
    margin: var(--figma-spacing-margin-s) 0 0;
    font-weight: var(--schedule-font-weight-semibold);
  }
}
</style>
