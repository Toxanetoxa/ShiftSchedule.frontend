import type { CalendarResponse, NormalizedShift, PublicationResponse } from './types'
import { describe, expect, it } from 'vitest'
import {
  isCalendarResponse,
  isPublicationResponse,
  isSaveCellsResponse,
  parseCalendarResponse,
} from './guards'

const scheduleId = '00000000-0000-4000-8000-000000000001'
const employeeId = '00000000-0000-4000-8000-000000000201'
const publicationId = '00000000-0000-4000-8000-000000000401'

function normalizedShift(): NormalizedShift {
  return {
    id: '00000000-0000-4000-8000-000000000301',
    startTime: '10:00',
    endTime: '18:00',
    endDayOffset: 0,
    startsAt: '2026-11-09T07:00:00Z',
    endsAt: '2026-11-09T15:00:00Z',
    durationMinutes: 480,
    sourceTemplateId: null,
    label: 'Своя смена',
    colorKey: 'custom',
  }
}

function calendar(): CalendarResponse {
  return {
    schedule: { id: scheduleId, name: 'График', timeZone: 'Europe/Moscow', version: 2 },
    range: { from: '2026-11-09', to: '2026-11-11' },
    employees: [
      {
        id: employeeId,
        fullName: 'Анна',
        positionTitle: 'Агент',
        avatarUrl: null,
        scheduledMinutes: 480,
        isActive: true,
      },
    ],
    shiftTemplates: [
      {
        id: '00000000-0000-4000-8000-000000000101',
        name: 'Утро',
        startTime: '07:00',
        endTime: '15:00',
        endDayOffset: 0,
        durationMinutes: 480,
        colorKey: 'morning',
      },
    ],
    shifts: [{ ...normalizedShift(), employeeId, workDate: '2026-11-09' }],
    coverage: [
      { date: '2026-11-09', shiftCount: 1, covered: true },
      { date: '2026-11-10', shiftCount: 0, covered: false },
    ],
  }
}

function publication(): PublicationResponse {
  const source = calendar()
  return {
    id: publicationId,
    scheduleId,
    range: source.range,
    sourceVersion: 2,
    publishedAt: '2026-11-09T12:00:01Z',
    snapshot: {
      schemaVersion: 1,
      schedule: source.schedule,
      range: source.range,
      employees: source.employees,
      shifts: source.shifts,
      coverage: source.coverage,
    },
  }
}

describe('schedule response guards', () => {
  it('accepts the exact calendar and publication DTOs without casting unknown success data', () => {
    expect(isCalendarResponse(calendar())).toBe(true)
    expect(isPublicationResponse(publication())).toBe(true)
    expect(parseCalendarResponse(calendar())).toEqual(calendar())
  })

  it.each(['Invalid/Zone', '', '   ', '+25:00'])(
    'rejects an unsupported schedule time zone %j before rendering dates',
    (timeZone) => {
      const response = calendar()
      response.schedule.timeZone = timeZone
      expect(isCalendarResponse(response)).toBe(false)
      expect(() => parseCalendarResponse(response)).toThrowError(
        expect.objectContaining({ code: 'INVALID_RESPONSE' }),
      )
      const snapshot = publication()
      snapshot.snapshot.schedule.timeZone = timeZone
      expect(isPublicationResponse(snapshot)).toBe(false)
    },
  )

  it.each(['UTC', 'Europe/Moscow', 'America/New_York'])(
    'accepts a supported schedule time zone %s',
    (timeZone) => {
      const response = calendar()
      response.schedule.timeZone = timeZone
      expect(isCalendarResponse(response)).toBe(true)
    },
  )

  it('rejects duplicate calendar cells and incomplete date coverage', () => {
    const duplicated = calendar()
    duplicated.shifts.push({ ...duplicated.shifts[0]!, id: '00000000-0000-4000-8000-000000000302' })
    expect(isCalendarResponse(duplicated)).toBe(false)
    const incomplete = calendar()
    incomplete.coverage.pop()
    expect(isCalendarResponse(incomplete)).toBe(false)
    expect(() => parseCalendarResponse(incomplete)).toThrowError(
      expect.objectContaining({ code: 'INVALID_RESPONSE' }),
    )
  })

  it('rejects inconsistent normalized intervals and duplicate save acknowledgements', () => {
    const changedCell = { employeeId, workDate: '2026-11-09', shift: normalizedShift() }
    expect(isSaveCellsResponse({ version: 3, changedCells: [changedCell] })).toBe(true)
    expect(isSaveCellsResponse({ version: 3, changedCells: [changedCell, changedCell] })).toBe(
      false,
    )
    expect(
      isSaveCellsResponse({
        version: 3,
        changedCells: [{ ...changedCell, shift: { ...normalizedShift(), durationMinutes: 500 } }],
      }),
    ).toBe(false)
    expect(isSaveCellsResponse({ version: '3', changedCells: [changedCell] })).toBe(false)
    expect(
      isSaveCellsResponse({
        version: 3,
        changedCells: [{ ...changedCell, shift: { ...normalizedShift(), colorKey: ['custom'] } }],
      }),
    ).toBe(false)
    const source = calendar()
    expect(
      isCalendarResponse({
        ...source,
        shiftTemplates: [{ ...source.shiftTemplates[0]!, colorKey: ['morning'] }],
      }),
    ).toBe(false)
  })

  it('rejects a publication whose snapshot does not match its source version or range', () => {
    const wrongVersion = publication()
    wrongVersion.snapshot.schedule.version = 3
    expect(isPublicationResponse(wrongVersion)).toBe(false)
    const wrongRange = publication()
    wrongRange.range = { from: '2026-11-09', to: '2026-11-10' }
    expect(isPublicationResponse(wrongRange)).toBe(false)
  })
})
