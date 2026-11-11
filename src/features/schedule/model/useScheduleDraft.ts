import type {
  ApiDateRange,
  ApiShift,
  CalendarResponse,
  CellChange,
  SaveCellsResponse,
} from '@schedule/api/types'
import type {
  CellConflict,
  CellKey,
  CellRef,
  ScheduleRow,
  ShiftInput,
  ShiftTemplate,
  ShiftTone,
  ShiftViewModel,
} from '@schedule/domain/types'
import { sameShift } from '@schedule/domain/operations'
import { cellKey } from '@schedule/domain/types'
import { computed, ref, shallowRef } from 'vue'

interface DirtyCell {
  cell: CellRef
  base: ShiftViewModel | null
  local: ShiftViewModel | null
}
export interface FrozenScheduleSave {
  scheduleId: string
  range: ApiDateRange
  expectedVersion: number
  changes: CellChange[]
  entries: Map<CellKey, DirtyCell>
  baseCalendar: CalendarResponse
}
export interface RebaseResolution {
  cell: CellRef
  choice: 'local' | 'remote'
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function copyShift(shift: ShiftViewModel | null | undefined): ShiftViewModel | null {
  return shift ? { ...shift } : null
}
function tone(value: string): ShiftTone {
  return value === 'morning' || value === 'day' || value === 'evening' ? value : 'custom'
}
export function shiftViewModel(shift: ApiShift): ShiftViewModel {
  return {
    id: shift.id,
    startTime: shift.startTime,
    endTime: shift.endTime,
    endDayOffset: shift.endDayOffset,
    sourceTemplateId: shift.sourceTemplateId,
    label: shift.label,
    colorKey: tone(shift.colorKey),
    durationMinutes: shift.durationMinutes,
  }
}
function shiftInput(shift: ShiftViewModel | null): ShiftInput | null {
  return shift
    ? {
        startTime: shift.startTime,
        endTime: shift.endTime,
        endDayOffset: shift.endDayOffset,
        sourceTemplateId: shift.sourceTemplateId ?? null,
      }
    : null
}
function remoteIndex(calendar: CalendarResponse | null): Map<CellKey, ShiftViewModel> {
  return new Map(calendar?.shifts.map((shift) => [cellKey(shift), shiftViewModel(shift)]) ?? [])
}
function sameScope(left: CalendarResponse, right: CalendarResponse): boolean {
  return (
    left.schedule.id === right.schedule.id &&
    left.range.from === right.range.from &&
    left.range.to === right.range.to
  )
}

export function useScheduleDraft() {
  const latestRemote = shallowRef<CalendarResponse | null>(null)
  const saveVersion = ref<number | null>(null)
  const dirtyCells = shallowRef(new Map<CellKey, DirtyCell>())
  const serverCells = computed(() => remoteIndex(latestRemote.value))
  const dirtyKeys = computed(() => [...dirtyCells.value.keys()])
  const dirtyCount = computed(() => dirtyCells.value.size)
  const remoteUpdated = computed(
    () => dirtyCount.value > 0 && saveVersion.value !== latestRemote.value?.schedule.version,
  )
  const templates = computed<ShiftTemplate[]>(
    () =>
      latestRemote.value?.shiftTemplates.map((template) => ({
        id: template.id,
        label: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        endDayOffset: template.endDayOffset,
        sourceTemplateId: template.id,
        durationMinutes: template.durationMinutes,
        colorKey:
          template.colorKey === 'morning' || template.colorKey === 'evening'
            ? template.colorKey
            : 'day',
      })) ?? [],
  )
  const conflicts = computed<CellConflict[]>(() =>
    [...dirtyCells.value.entries()].flatMap(([key, entry]) => {
      const remote = serverCells.value.get(key) ?? null
      if (sameShift(remote, entry.base) || sameShift(remote, entry.local)) return []
      return [
        {
          cell: { ...entry.cell },
          employeeName:
            latestRemote.value?.employees.find((employee) => employee.id === entry.cell.employeeId)
              ?.fullName ?? entry.cell.employeeId,
          local: copyShift(entry.local),
          remote: copyShift(remote),
        },
      ]
    }),
  )
  const conflictKeys = computed(
    () => new Set(conflicts.value.map((conflict) => cellKey(conflict.cell))),
  )
  const rows = computed<ScheduleRow[]>({
    get: () =>
      latestRemote.value?.employees.map((employee) => {
        const cells: ScheduleRow['cells'] = {}
        for (const shift of latestRemote.value!.shifts) {
          if (shift.employeeId === employee.id) cells[shift.workDate] = shiftViewModel(shift)
        }
        const dirtyDates: string[] = []
        const conflictDates: string[] = []
        for (const [key, entry] of dirtyCells.value) {
          if (entry.cell.employeeId !== employee.id) continue
          cells[entry.cell.workDate] = copyShift(entry.local)
          dirtyDates.push(entry.cell.workDate)
          if (conflictKeys.value.has(key)) conflictDates.push(entry.cell.workDate)
        }
        return {
          employee: {
            id: employee.id,
            name: employee.fullName,
            position: employee.positionTitle,
            avatarUrl: employee.avatarUrl,
            active: employee.isActive,
          },
          cells,
          dirtyDates,
          conflictDates,
          scheduledMinutes: Object.values(cells).reduce(
            (sum, shift) => sum + (shift?.durationMinutes ?? 0),
            0,
          ),
        }
      }) ?? [],
    set: (nextRows) => {
      const calendar = latestRemote.value
      if (!calendar) return
      const current = new Map(rows.value.map((row) => [row.employee.id, row]))
      const nextDirty = new Map(dirtyCells.value)
      for (const row of nextRows) {
        const previous = current.get(row.employee.id)
        if (!previous) continue
        for (const date of new Set([...Object.keys(previous.cells), ...Object.keys(row.cells)])) {
          if (date < calendar.range.from || date >= calendar.range.to) continue
          const local = copyShift(row.cells[date])
          if (sameShift(previous.cells[date], local)) continue
          const cell = { employeeId: row.employee.id, workDate: date }
          const key = cellKey(cell)
          const existing = nextDirty.get(key)
          const base = existing ? existing.base : copyShift(serverCells.value.get(key))
          if (sameShift(base, local)) nextDirty.delete(key)
          else nextDirty.set(key, { cell, base: copyShift(base), local })
        }
      }
      if (!dirtyCells.value.size && nextDirty.size) saveVersion.value = calendar.schedule.version
      dirtyCells.value = nextDirty
      if (!nextDirty.size) saveVersion.value = calendar.schedule.version
    },
  })

  function acceptCalendar(calendar: CalendarResponse): boolean {
    const previous = latestRemote.value
    if (previous && !sameScope(previous, calendar) && dirtyCount.value) return false
    if (
      previous &&
      sameScope(previous, calendar) &&
      calendar.schedule.version < previous.schedule.version
    )
      return false
    latestRemote.value = clone(calendar)
    if (!dirtyCount.value) saveVersion.value = calendar.schedule.version
    return true
  }

  function discard(): void {
    dirtyCells.value = new Map()
    saveVersion.value = latestRemote.value?.schedule.version ?? null
  }
  function reset(): void {
    latestRemote.value = null
    dirtyCells.value = new Map()
    saveVersion.value = null
  }

  function freeze(): FrozenScheduleSave | null {
    if (!latestRemote.value || !dirtyCount.value || saveVersion.value === null) return null
    if (dirtyCount.value > 2000)
      throw new Error('За одно сохранение можно изменить не больше 2000 ячеек.')
    const entries = new Map(
      [...dirtyCells.value.entries()].map(([key, entry]) => [key, clone(entry)]),
    )
    return {
      scheduleId: latestRemote.value.schedule.id,
      range: { ...latestRemote.value.range },
      expectedVersion: saveVersion.value,
      changes: [...entries.values()].map((entry) => ({
        ...entry.cell,
        shift: shiftInput(entry.local),
      })),
      entries,
      baseCalendar: clone(latestRemote.value),
    }
  }

  function acceptSave(response: SaveCellsResponse, frozen: FrozenScheduleSave): void {
    const current = latestRemote.value
    if (
      !current ||
      current.schedule.id !== frozen.scheduleId ||
      current.range.from !== frozen.range.from ||
      current.range.to !== frozen.range.to ||
      response.version < frozen.expectedVersion
    )
      return
    const acknowledged = new Map(response.changedCells.map((cell) => [cellKey(cell), cell]))
    const nextDirty = new Map(dirtyCells.value)
    for (const [key, sent] of frozen.entries) {
      const entry = nextDirty.get(key)
      const saved = acknowledged.get(key)
      if (!entry || !saved) continue
      if (sameShift(entry.local, sent.local)) nextDirty.delete(key)
      else
        nextDirty.set(key, {
          ...entry,
          base: saved.shift
            ? shiftViewModel({
                ...saved.shift,
                employeeId: saved.employeeId,
                workDate: saved.workDate,
              })
            : null,
        })
    }
    if (response.version >= current.schedule.version) {
      const calendar = clone(frozen.baseCalendar)
      const shifts = new Map(calendar.shifts.map((shift) => [cellKey(shift), shift]))
      for (const [key, saved] of acknowledged) {
        if (saved.shift)
          shifts.set(key, {
            ...saved.shift,
            employeeId: saved.employeeId,
            workDate: saved.workDate,
          })
        else shifts.delete(key)
      }
      calendar.shifts = [...shifts.values()]
      calendar.schedule.version = response.version
      const totals = new Map<string, number>()
      const counts = new Map<string, number>()
      for (const shift of calendar.shifts) {
        totals.set(shift.employeeId, (totals.get(shift.employeeId) ?? 0) + shift.durationMinutes)
        counts.set(shift.workDate, (counts.get(shift.workDate) ?? 0) + 1)
      }
      calendar.employees = calendar.employees.map((employee) => ({
        ...employee,
        scheduledMinutes: totals.get(employee.id) ?? 0,
      }))
      calendar.coverage = calendar.coverage.map((day) => ({
        ...day,
        shiftCount: counts.get(day.date) ?? 0,
        covered: (counts.get(day.date) ?? 0) > 0,
      }))
      latestRemote.value = calendar
    }
    dirtyCells.value = nextDirty
    saveVersion.value = nextDirty.size ? response.version : latestRemote.value!.schedule.version
  }

  function rebase(version: number, resolutions: RebaseResolution[]): boolean {
    if (!latestRemote.value || latestRemote.value.schedule.version !== version) return false
    const choices = new Map(
      resolutions.map((resolution) => [cellKey(resolution.cell), resolution.choice]),
    )
    if (conflicts.value.some((conflict) => !choices.has(cellKey(conflict.cell)))) return false
    const nextDirty = new Map<CellKey, DirtyCell>()
    for (const [key, entry] of dirtyCells.value) {
      const remote = copyShift(serverCells.value.get(key))
      if (choices.get(key) === 'remote' || sameShift(remote, entry.local)) continue
      nextDirty.set(key, { ...entry, base: remote, local: copyShift(entry.local) })
    }
    dirtyCells.value = nextDirty
    saveVersion.value = version
    return true
  }

  return {
    latestRemote,
    saveVersion,
    dirtyKeys,
    dirtyCount,
    rows,
    templates,
    conflicts,
    remoteUpdated,
    acceptCalendar,
    acceptSave,
    freeze,
    rebase,
    reset,
    discard,
  }
}
