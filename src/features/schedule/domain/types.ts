export type CalendarView = 'week' | 'month'
export type IsoDate = string
export type CellKey = `${string}:${string}`
export type ShiftTone = 'morning' | 'day' | 'evening' | 'custom'

export interface CellRef {
  employeeId: string
  workDate: IsoDate
}

export interface ShiftInput {
  startTime: string
  endTime: string
  endDayOffset: 0 | 1
  sourceTemplateId: string | null
}

export interface ShiftViewModel extends ShiftInput {
  id?: string
  label: string
  colorKey: ShiftTone
  durationMinutes: number
}

export interface ShiftTemplate extends ShiftInput {
  id: string
  label: string
  colorKey: Exclude<ShiftTone, 'custom'>
  durationMinutes: number
}

export interface Employee {
  id: string
  name: string
  position: string
  avatarUrl?: string | null
  active?: boolean
}

export interface ScheduleDate {
  date: IsoDate
  weekdayLabel: string
  dayLabel: string
  covered?: boolean
  isToday?: boolean
}

export interface ScheduleRow {
  employee: Employee
  scheduledMinutes: number
  cells: Record<IsoDate, ShiftViewModel | null>
  dirtyDates?: readonly IsoDate[]
  conflictDates?: readonly IsoDate[]
}

export interface DateRange {
  startDate: IsoDate
  endDate: IsoDate
}

export interface SelectionSummary {
  cellCount: number
  employeeCount: number
  dayCount: number
}

export interface CellConflict {
  cell: CellRef
  employeeName: string
  local: ShiftViewModel | null
  remote: ShiftViewModel | null
}

export interface GridDragState {
  source?: CellRef
  target?: CellRef
  allowed?: boolean
}

export type DragPayload =
  { kind: 'template'; templateId: string } | { kind: 'assignment'; source: CellRef }

export function cellKey(cell: CellRef): CellKey {
  return `${cell.employeeId}:${cell.workDate}`
}
