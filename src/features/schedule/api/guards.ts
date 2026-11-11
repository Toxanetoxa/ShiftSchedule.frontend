import type {
  ApiCoverage,
  ApiDateRange,
  ApiEmployee,
  ApiSchedule,
  ApiShift,
  ApiShiftTemplate,
  CalendarResponse,
  ChangedCell,
  NormalizedShift,
  PublicationMeta,
  PublicationResponse,
  PublicationSnapshotV1,
  SaveCellsResponse,
} from './types'
import { isIsoDate } from '@schedule/domain/format'
import { ApiError } from '@/shared/api/client'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const instantPattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function uuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function date(value: unknown): value is string {
  return typeof value === 'string' && isIsoDate(value)
}

function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  )
}

function instant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    instantPattern.test(value) &&
    date(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  )
}

function list<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard)
}

function unique(values: string[]): boolean {
  return new Set(values.map((value) => value.toLowerCase())).size === values.length
}

function timeRange(value: Record<string, unknown>): boolean {
  if (
    typeof value.startTime !== 'string' ||
    typeof value.endTime !== 'string' ||
    !timePattern.test(value.startTime) ||
    !timePattern.test(value.endTime) ||
    (value.endDayOffset !== 0 && value.endDayOffset !== 1)
  )
    return false
  const minutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  const duration = minutes(value.endTime) + value.endDayOffset * 1440 - minutes(value.startTime)
  return duration > 0 && duration < 1440
}

function timeZone(value: unknown): value is string {
  if (!text(value)) return false
  try {
    return Boolean(new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone)
  } catch {
    return false
  }
}

export function isApiDateRange(value: unknown): value is ApiDateRange {
  if (!isRecord(value) || !date(value.from) || !date(value.to)) return false
  const days =
    (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000
  return days >= 1 && days <= 62
}

function isApiSchedule(value: unknown): value is ApiSchedule {
  return (
    isRecord(value) &&
    uuid(value.id) &&
    text(value.name) &&
    timeZone(value.timeZone) &&
    integer(value.version, 1)
  )
}

function isApiEmployee(value: unknown): value is ApiEmployee {
  return (
    isRecord(value) &&
    uuid(value.id) &&
    text(value.fullName) &&
    text(value.positionTitle) &&
    (value.avatarUrl === null || typeof value.avatarUrl === 'string') &&
    integer(value.scheduledMinutes) &&
    typeof value.isActive === 'boolean'
  )
}

function isApiShiftTemplate(value: unknown): value is ApiShiftTemplate {
  return (
    isRecord(value) &&
    uuid(value.id) &&
    text(value.name) &&
    timeRange(value) &&
    integer(value.durationMinutes, 1, 1439) &&
    typeof value.colorKey === 'string' &&
    ['morning', 'day', 'evening'].includes(value.colorKey)
  )
}

export function isNormalizedShift(value: unknown): value is NormalizedShift {
  if (
    !isRecord(value) ||
    !uuid(value.id) ||
    !timeRange(value) ||
    !instant(value.startsAt) ||
    !instant(value.endsAt) ||
    !integer(value.durationMinutes, 1, 1439) ||
    (value.sourceTemplateId !== null && !uuid(value.sourceTemplateId)) ||
    !text(value.label) ||
    typeof value.colorKey !== 'string' ||
    !['morning', 'day', 'evening', 'custom'].includes(value.colorKey)
  )
    return false
  return (
    value.startsAt.endsWith(':00Z') &&
    value.endsAt.endsWith(':00Z') &&
    (Date.parse(value.endsAt) - Date.parse(value.startsAt)) / 60_000 === value.durationMinutes
  )
}

function isApiShift(value: unknown): value is ApiShift {
  return (
    isRecord(value) && uuid(value.employeeId) && date(value.workDate) && isNormalizedShift(value)
  )
}

function isCoverage(value: unknown): value is ApiCoverage {
  return (
    isRecord(value) &&
    date(value.date) &&
    integer(value.shiftCount) &&
    typeof value.covered === 'boolean' &&
    value.covered === value.shiftCount > 0
  )
}

function isCalendarContent(value: unknown): value is Omit<CalendarResponse, 'shiftTemplates'> {
  if (
    !isRecord(value) ||
    !isApiSchedule(value.schedule) ||
    !isApiDateRange(value.range) ||
    !list(value.employees, isApiEmployee) ||
    !list(value.shifts, isApiShift) ||
    !list(value.coverage, isCoverage)
  )
    return false
  if (
    !unique(value.employees.map((employee) => employee.id)) ||
    !unique(value.shifts.map((shift) => shift.id)) ||
    !unique(value.shifts.map((shift) => `${shift.employeeId}:${shift.workDate}`)) ||
    !unique(value.coverage.map((item) => item.date))
  )
    return false
  const { from, to } = value.range
  const employeeIds = new Set(value.employees.map((employee) => employee.id.toLowerCase()))
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  return (
    value.coverage.length === days &&
    value.coverage.every((item) => item.date >= from && item.date < to) &&
    value.shifts.every(
      (shift) =>
        employeeIds.has(shift.employeeId.toLowerCase()) &&
        shift.workDate >= from &&
        shift.workDate < to,
    )
  )
}

export function isCalendarResponse(value: unknown): value is CalendarResponse {
  if (!isRecord(value) || !list(value.shiftTemplates, isApiShiftTemplate)) return false
  const templates = value.shiftTemplates
  return isCalendarContent(value) && unique(templates.map((template) => template.id))
}

function isChangedCell(value: unknown): value is ChangedCell {
  return (
    isRecord(value) &&
    uuid(value.employeeId) &&
    date(value.workDate) &&
    (value.shift === null || isNormalizedShift(value.shift))
  )
}

export function isSaveCellsResponse(value: unknown): value is SaveCellsResponse {
  return (
    isRecord(value) &&
    integer(value.version, 1) &&
    list(value.changedCells, isChangedCell) &&
    value.changedCells.length > 0 &&
    value.changedCells.length <= 2000 &&
    unique(value.changedCells.map((cell) => `${cell.employeeId}:${cell.workDate}`))
  )
}

export function isPublicationMeta(value: unknown): value is PublicationMeta {
  return (
    isRecord(value) &&
    uuid(value.id) &&
    uuid(value.scheduleId) &&
    isApiDateRange(value.range) &&
    integer(value.sourceVersion, 1) &&
    instant(value.publishedAt)
  )
}

function isPublicationSnapshot(value: unknown): value is PublicationSnapshotV1 {
  return isRecord(value) && value.schemaVersion === 1 && isCalendarContent(value)
}

export function isPublicationResponse(value: unknown): value is PublicationResponse {
  return (
    isRecord(value) &&
    isPublicationMeta(value) &&
    isPublicationSnapshot(value.snapshot) &&
    value.snapshot.schedule.id.toLowerCase() === value.scheduleId.toLowerCase() &&
    value.snapshot.schedule.version === value.sourceVersion &&
    value.snapshot.range.from === value.range.from &&
    value.snapshot.range.to === value.range.to
  )
}

export function invalidResponse(
  message = 'Ответ API не соответствует ожидаемому формату графика.',
): never {
  throw new ApiError(200, 'INVALID_RESPONSE', message)
}

export function parseCalendarResponse(value: unknown): CalendarResponse {
  if (!isCalendarResponse(value)) invalidResponse()
  return value
}

export function parseSaveCellsResponse(value: unknown): SaveCellsResponse {
  if (!isSaveCellsResponse(value))
    invalidResponse('API вернул некорректное подтверждение сохранения.')
  return value
}

export function parsePublicationMeta(value: unknown): PublicationMeta {
  if (!isPublicationMeta(value)) invalidResponse('API вернул некорректные данные публикации.')
  return value
}

export function parsePublicationResponse(value: unknown): PublicationResponse {
  if (!isPublicationResponse(value)) invalidResponse('API вернул некорректный снимок публикации.')
  return value
}
