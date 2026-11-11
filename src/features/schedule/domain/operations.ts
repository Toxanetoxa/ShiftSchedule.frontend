import type {
  CellKey,
  CellRef,
  IsoDate,
  ScheduleRow,
  ShiftInput,
  ShiftTemplate,
  ShiftViewModel,
} from './types'
import { isIsoDate } from './format'
import { cellKey } from './types'

export interface ScheduleOperationContext {
  rows: readonly ScheduleRow[]
  templates: readonly ShiftTemplate[]
  editableDates: readonly IsoDate[]
}

export type ScheduleOperation =
  | { kind: 'template'; templateId: string; targets: readonly CellRef[] }
  | { kind: 'custom'; input: ShiftInput; targets: readonly CellRef[] }
  | { kind: 'move'; source: CellRef; target: CellRef }
  | { kind: 'clear'; targets: readonly CellRef[] }

export type ScheduleOperationResult =
  | { status: 'applied'; rows: ScheduleRow[]; changedCells: CellRef[] }
  | { status: 'noop' }
  | { status: 'confirm-replace'; source?: CellRef; targets: CellRef[] }
  | {
      status: 'blocked'
      reason:
        | 'employee-inactive'
        | 'cell-unavailable'
        | 'template-unavailable'
        | 'source-empty'
        | 'invalid-time'
        | 'overlap'
      conflictingCells?: CellRef[]
    }

interface CellAssignment {
  cell: CellRef
  before: ShiftViewModel | null
  after: ShiftViewModel | null
}

function timeMinutes(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null
  }

  const [hours, minutes] = value.split(':').map(Number)

  return hours! * 60 + minutes!
}

function shiftMinutes(shift: ShiftInput): number | null {
  const start = timeMinutes(shift.startTime)
  const end = timeMinutes(shift.endTime)
  if (
    start === null ||
    end === null ||
    (shift.endDayOffset !== 0 && shift.endDayOffset !== 1) ||
    start === end
  ) {
    return null
  }

  const duration = end + 1440 * shift.endDayOffset - start

  return duration > 0 && duration < 1440 ? duration : null
}

function copyAssignment(shift: ShiftViewModel, durationMinutes: number): ShiftViewModel {
  return {
    startTime: shift.startTime,
    endTime: shift.endTime,
    endDayOffset: shift.endDayOffset,
    sourceTemplateId: shift.sourceTemplateId,
    label: shift.label,
    colorKey: shift.colorKey,
    durationMinutes,
  }
}

/** Compare user intent and the assignment snapshot; IDs and derived duration are not changes. */
export function sameShift(
  left: ShiftViewModel | null | undefined,
  right: ShiftViewModel | null | undefined,
): boolean {
  if (!left || !right) {
    return !left && !right
  }

  return (
    left.startTime === right.startTime &&
    left.endTime === right.endTime &&
    left.endDayOffset === right.endDayOffset &&
    (left.sourceTemplateId ?? null) === (right.sourceTemplateId ?? null) &&
    left.label === right.label &&
    left.colorKey === right.colorKey
  )
}

function interval(date: IsoDate, shift: ShiftViewModel): [number, number] | null {
  const duration = shiftMinutes(shift)
  if (!isIsoDate(date) || duration === null) {
    return null
  }

  const [year, month, day] = date.split('-').map(Number)
  // A calendar-day ordinal keeps the Moscow preview independent of the browser's zone.
  // The backend remains authoritative for real instants and unloaded neighbouring dates.
  const anchor = new Date(0)
  anchor.setUTCFullYear(year!, month! - 1, day!)
  const start = anchor.getTime() / 60_000 + timeMinutes(shift.startTime)!

  return [start, start + duration]
}

function uniqueCells(cells: readonly CellRef[]): CellRef[] {
  return Array.from(new Map(cells.map((cell) => [cellKey(cell), { ...cell }])).values())
}

/** Build and validate one final state; no input objects are changed, including on confirmation. */
export function applyScheduleOperation(
  context: ScheduleOperationContext,
  command: ScheduleOperation,
  options: { replaceOccupied?: boolean } = {},
): ScheduleOperationResult {
  const rowsByEmployee = new Map(context.rows.map((row) => [row.employee.id, row]))
  const editableDates = new Set(context.editableDates)
  const targets = uniqueCells(command.kind === 'move' ? [command.target] : command.targets)
  const involved = command.kind === 'move' ? [...targets, command.source] : targets
  if (
    involved.some(
      (cell) =>
        !rowsByEmployee.has(cell.employeeId) ||
        !isIsoDate(cell.workDate) ||
        !editableDates.has(cell.workDate),
    )
  ) {
    return { status: 'blocked', reason: 'cell-unavailable' }
  }
  if (
    !targets.length ||
    (command.kind === 'move' && cellKey(command.source) === cellKey(command.target))
  ) {
    return { status: 'noop' }
  }

  let value: ShiftViewModel | null = null
  if (command.kind === 'template') {
    const template = context.templates.find((item) => item.id === command.templateId)
    if (!template) {
      return { status: 'blocked', reason: 'template-unavailable' }
    }
    const duration = shiftMinutes(template)
    if (duration === null) {
      return { status: 'blocked', reason: 'invalid-time' }
    }
    value = copyAssignment({ ...template, sourceTemplateId: template.id }, duration)
  } else if (command.kind === 'custom') {
    const duration = shiftMinutes(command.input)
    if (duration === null) {
      return { status: 'blocked', reason: 'invalid-time' }
    }
    value = {
      startTime: command.input.startTime,
      endTime: command.input.endTime,
      endDayOffset: command.input.endDayOffset,
      sourceTemplateId: null,
      label: 'Своя смена',
      colorKey: 'custom',
      durationMinutes: duration,
    }
  } else if (command.kind === 'move') {
    const source = rowsByEmployee.get(command.source.employeeId)!.cells[command.source.workDate]
    if (!source) {
      return { status: 'blocked', reason: 'source-empty' }
    }
    const duration = shiftMinutes(source)
    if (duration === null) {
      return { status: 'blocked', reason: 'invalid-time' }
    }
    value = copyAssignment(source, duration)
  }

  const assignments: CellAssignment[] = targets.map((cell) => ({
    cell,
    before: rowsByEmployee.get(cell.employeeId)!.cells[cell.workDate] ?? null,
    after: value ? { ...value } : null,
  }))
  if (command.kind === 'move') {
    assignments.push({
      cell: { ...command.source },
      before: rowsByEmployee.get(command.source.employeeId)!.cells[command.source.workDate] ?? null,
      after: null,
    })
  }
  const changes = assignments.filter(
    (assignment) => !sameShift(assignment.before, assignment.after),
  )
  if (!changes.length) {
    return { status: 'noop' }
  }
  if (
    assignments.some(
      (assignment) =>
        assignment.after &&
        rowsByEmployee.get(assignment.cell.employeeId)!.employee.active === false,
    )
  ) {
    return { status: 'blocked', reason: 'employee-inactive' }
  }

  const changesByEmployee = new Map<string, CellAssignment[]>()
  for (const change of changes) {
    const rowChanges = changesByEmployee.get(change.cell.employeeId) ?? []
    rowChanges.push(change)
    changesByEmployee.set(change.cell.employeeId, rowChanges)
  }
  const nextRows = context.rows.map((row) => {
    const rowChanges = changesByEmployee.get(row.employee.id)
    if (!rowChanges) {
      return row
    }
    const cells = { ...row.cells }
    for (const change of rowChanges) {
      cells[change.cell.workDate] = change.after
    }

    return { ...row, cells }
  })
  const nextByEmployee = new Map(nextRows.map((row) => [row.employee.id, row]))
  const overlaps: CellRef[] = []
  for (const change of changes) {
    if (!change.after) {
      continue
    }
    const candidate = interval(change.cell.workDate, change.after)!
    const row = nextByEmployee.get(change.cell.employeeId)!
    for (const [date, shift] of Object.entries(row.cells)) {
      if (!shift || date === change.cell.workDate) {
        continue
      }
      const other = interval(date, shift)
      if (!other) {
        return {
          status: 'blocked',
          reason: 'invalid-time',
          conflictingCells: [{ employeeId: row.employee.id, workDate: date }],
        }
      }
      if (candidate[0] < other[1] && other[0] < candidate[1]) {
        overlaps.push(change.cell, { employeeId: row.employee.id, workDate: date })
      }
    }
  }
  if (overlaps.length) {
    return { status: 'blocked', reason: 'overlap', conflictingCells: uniqueCells(overlaps) }
  }

  const occupied = changes
    .filter((change) => change.before && change.after)
    .map((change) => change.cell)
  if (occupied.length && !options.replaceOccupied) {
    return command.kind === 'move'
      ? { status: 'confirm-replace', source: { ...command.source }, targets: occupied }
      : { status: 'confirm-replace', targets: occupied }
  }

  return {
    status: 'applied',
    rows: nextRows,
    changedCells: changes.map((change) => ({ ...change.cell })),
  }
}

/** Recompute the diff instead of accumulating dirty flags; reverting an edit removes its key. */
export function dirtyCellKeys(
  baseRows: readonly ScheduleRow[],
  currentRows: readonly ScheduleRow[],
): CellKey[] {
  const baseByEmployee = new Map(baseRows.map((row) => [row.employee.id, row]))
  const currentByEmployee = new Map(currentRows.map((row) => [row.employee.id, row]))
  const employeeIds = new Set([...currentByEmployee.keys(), ...baseByEmployee.keys()])
  const dirty: CellKey[] = []
  for (const employeeId of employeeIds) {
    const base = baseByEmployee.get(employeeId)?.cells ?? {}
    const current = currentByEmployee.get(employeeId)?.cells ?? {}
    const dates = new Set([...Object.keys(base), ...Object.keys(current)])
    for (const workDate of Array.from(dates).sort()) {
      if (!sameShift(base[workDate], current[workDate])) {
        dirty.push(cellKey({ employeeId, workDate }))
      }
    }
  }

  return dirty
}
