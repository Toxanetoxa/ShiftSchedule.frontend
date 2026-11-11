import type { ShiftInput, ShiftTone } from '@schedule/domain/types'

export interface ApiDateRange {
  from: string
  to: string
}

export interface ApiSchedule {
  id: string
  name: string
  timeZone: string
  version: number
}

export interface ApiEmployee {
  id: string
  fullName: string
  positionTitle: string
  avatarUrl: string | null
  scheduledMinutes: number
  isActive: boolean
}

export interface ApiShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  endDayOffset: 0 | 1
  durationMinutes: number
  colorKey: Exclude<ShiftTone, 'custom'>
}

export interface NormalizedShift extends ShiftInput {
  id: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  label: string
  colorKey: ShiftTone
}

export interface ApiShift extends NormalizedShift {
  employeeId: string
  workDate: string
}

export interface ApiCoverage {
  date: string
  shiftCount: number
  covered: boolean
}

export interface CalendarResponse {
  schedule: ApiSchedule
  range: ApiDateRange
  employees: ApiEmployee[]
  shiftTemplates: ApiShiftTemplate[]
  shifts: ApiShift[]
  coverage: ApiCoverage[]
}

export interface CellChange {
  employeeId: string
  workDate: string
  shift: ShiftInput | null
}

export interface SaveCellsRequest {
  expectedVersion: number
  changes: CellChange[]
}

export interface ChangedCell {
  employeeId: string
  workDate: string
  shift: NormalizedShift | null
}

export interface SaveCellsResponse {
  version: number
  changedCells: ChangedCell[]
}

export interface PublishRequest extends ApiDateRange {
  expectedVersion: number
}

export interface PublicationMeta {
  id: string
  scheduleId: string
  range: ApiDateRange
  sourceVersion: number
  publishedAt: string
}

export interface PublicationSnapshotV1 extends Omit<CalendarResponse, 'shiftTemplates'> {
  schemaVersion: 1
}

export interface PublicationResponse extends PublicationMeta {
  snapshot: PublicationSnapshotV1
}
