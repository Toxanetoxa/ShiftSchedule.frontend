import type {
  ApiDateRange,
  CalendarResponse,
  PublicationMeta,
  PublicationResponse,
  PublishRequest,
  SaveCellsRequest,
  SaveCellsResponse,
} from './types'
import { requestJson } from '@/shared/api/client'
import {
  invalidResponse,
  parseCalendarResponse,
  parsePublicationMeta,
  parsePublicationResponse,
  parseSaveCellsResponse,
} from './guards'

export const configuredScheduleId =
  import.meta.env.VITE_SCHEDULE_ID?.trim().toLowerCase() || '00000000-0000-4000-8000-000000000001'

function schedulePath(id: string): string {
  return `v1/schedules/${encodeURIComponent(id)}`
}

export async function getCalendar(
  id: string,
  range: ApiDateRange,
  signal?: AbortSignal,
): Promise<CalendarResponse> {
  const requestedRange = { from: range.from, to: range.to }
  const query = new URLSearchParams(requestedRange)
  const data = parseCalendarResponse(
    await requestJson(`${schedulePath(id)}/calendar?${query}`, { signal }),
  )
  if (
    data.schedule.id.toLowerCase() !== id.toLowerCase() ||
    data.range.from !== requestedRange.from ||
    data.range.to !== requestedRange.to
  )
    invalidResponse('API вернул календарь другого графика или диапазона.')
  return data
}

export async function saveCells(id: string, input: SaveCellsRequest): Promise<SaveCellsResponse> {
  const expectedVersion = input.expectedVersion
  const changes = input.changes.map((cell) => ({
    employeeId: cell.employeeId,
    workDate: cell.workDate,
    shift:
      cell.shift === null
        ? null
        : {
            startTime: cell.shift.startTime,
            endTime: cell.shift.endTime,
            endDayOffset: cell.shift.endDayOffset,
            sourceTemplateId: cell.shift.sourceTemplateId,
          },
  }))
  const data = parseSaveCellsResponse(
    await requestJson(`${schedulePath(id)}/cells`, {
      method: 'PATCH',
      body: { expectedVersion, changes },
    }),
  )
  const expectedCells = new Map(
    changes.map((cell) => [`${cell.employeeId.toLowerCase()}:${cell.workDate}`, cell]),
  )
  if (
    data.version < expectedVersion ||
    expectedCells.size !== changes.length ||
    data.changedCells.length !== expectedCells.size ||
    data.changedCells.some((cell) => {
      const sent = expectedCells.get(`${cell.employeeId.toLowerCase()}:${cell.workDate}`)
      if (!sent) return true
      if (sent.shift === null || cell.shift === null) return sent.shift !== cell.shift
      return (
        sent.shift.startTime !== cell.shift.startTime ||
        sent.shift.endTime !== cell.shift.endTime ||
        sent.shift.endDayOffset !== cell.shift.endDayOffset ||
        sent.shift.sourceTemplateId?.toLowerCase() !== cell.shift.sourceTemplateId?.toLowerCase()
      )
    })
  )
    invalidResponse('Подтверждение сохранения не соответствует отправленным изменениям ячеек.')
  return data
}

export async function createPublication(
  id: string,
  input: PublishRequest,
): Promise<PublicationMeta> {
  const request = { expectedVersion: input.expectedVersion, from: input.from, to: input.to }
  const data = parsePublicationMeta(
    await requestJson(`${schedulePath(id)}/publications`, {
      method: 'POST',
      body: request,
    }),
  )
  if (
    data.scheduleId.toLowerCase() !== id.toLowerCase() ||
    data.sourceVersion !== request.expectedVersion ||
    data.range.from !== request.from ||
    data.range.to !== request.to
  )
    invalidResponse('Подтверждение публикации не соответствует выбранной версии и диапазону.')
  return data
}

export async function getPublication(
  id: string,
  publicationId: string,
  signal?: AbortSignal,
): Promise<PublicationResponse> {
  const data = parsePublicationResponse(
    await requestJson(`${schedulePath(id)}/publications/${encodeURIComponent(publicationId)}`, {
      signal,
    }),
  )
  if (
    data.scheduleId.toLowerCase() !== id.toLowerCase() ||
    data.id.toLowerCase() !== publicationId.toLowerCase()
  )
    invalidResponse('API вернул другую публикацию.')
  return data
}
