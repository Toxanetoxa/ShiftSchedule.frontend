import type { CalendarResponse, NormalizedShift, PublicationResponse } from './types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPublication, getCalendar, getPublication, saveCells } from './api'

const scheduleId = '00000000-0000-4000-8000-000000000001'
const employeeId = '00000000-0000-4000-8000-000000000201'
const otherEmployeeId = '00000000-0000-4000-8000-000000000202'
const publicationId = '00000000-0000-4000-8000-000000000401'
const range = { from: '2026-11-09', to: '2026-11-11' }

function shift(): NormalizedShift {
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
    schedule: { id: scheduleId, name: 'График', timeZone: 'Europe/Moscow', version: 1 },
    range,
    employees: [],
    shiftTemplates: [],
    shifts: [],
    coverage: [
      { date: range.from, shiftCount: 0, covered: false },
      { date: '2026-11-10', shiftCount: 0, covered: false },
    ],
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('schedule HTTP operations', () => {
  it('requests the selected calendar range with the query cancellation signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(calendar()))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal

    await expect(getCalendar(scheduleId, range, signal)).resolves.toEqual(calendar())

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/schedules/${scheduleId}/calendar?from=2026-11-09&to=2026-11-11`,
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    )
  })

  it('cancels the calendar read when the query controller is aborted', async () => {
    const controller = new AbortController()
    const reason = new DOMException('Period changed', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((_, reject) => {
            options.signal!.addEventListener('abort', () => reject(options.signal!.reason), {
              once: true,
            })
          }),
      ),
    )

    const rejection = expect(getCalendar(scheduleId, range, controller.signal)).rejects.toBe(reason)
    controller.abort(reason)
    await rejection
  })

  it('sends only writable ShiftInput fields and accepts a complete normalized acknowledgement', async () => {
    const changedCell = { employeeId, workDate: range.from, shift: shift() }
    const fetchMock = vi.fn().mockResolvedValue(json({ version: 2, changedCells: [changedCell] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveCells(scheduleId, { expectedVersion: 1, changes: [changedCell] }),
    ).resolves.toMatchObject({ version: 2, changedCells: [changedCell] })

    expect(fetchMock.mock.calls[0]![0]).toBe(`/api/v1/schedules/${scheduleId}/cells`)
    const options = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(options.body))).toEqual({
      expectedVersion: 1,
      changes: [
        {
          employeeId,
          workDate: range.from,
          shift: {
            startTime: '10:00',
            endTime: '18:00',
            endDayOffset: 0,
            sourceTemplateId: null,
          },
        },
      ],
    })
    expect(options.method).toBe('PATCH')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['missing', 'duplicate', 'unexpected'] as const)(
    'rejects %s acknowledgements instead of allowing the editor to discard unacknowledged changes',
    async (scenario) => {
      const first = { employeeId, workDate: range.from, shift: null }
      const second = { employeeId: otherEmployeeId, workDate: range.from, shift: null }
      const changedCells =
        scenario === 'missing'
          ? [first]
          : scenario === 'duplicate'
            ? [first, first]
            : [first, { ...second, workDate: '2026-11-10' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ version: 2, changedCells })))

      await expect(
        saveCells(scheduleId, { expectedVersion: 1, changes: [first, second] }),
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    },
  )

  it('does not retry a failed write and preserves backend validation details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        {
          error: {
            code: 'SHIFT_OVERLAP',
            message: 'Пересечение.',
            details: { employeeId, workDate: range.from },
          },
        },
        409,
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveCells(scheduleId, {
        expectedVersion: 1,
        changes: [{ employeeId, workDate: range.from, shift: null }],
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'SHIFT_OVERLAP',
      details: { employeeId, workDate: range.from },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['clear-became-assignment', 'assignment-became-clear', 'wrong-template'] as const)(
    'rejects a valid-shaped acknowledgement with different user intent: %s',
    async (scenario) => {
      const sentShift = scenario === 'clear-became-assignment' ? null : shift()
      const acknowledgedShift =
        scenario === 'assignment-became-clear'
          ? null
          : {
              ...shift(),
              sourceTemplateId:
                scenario === 'wrong-template' ? '00000000-0000-4000-8000-000000000101' : null,
            }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          json({
            version: 2,
            changedCells: [{ employeeId, workDate: range.from, shift: acknowledgedShift }],
          }),
        ),
      )

      await expect(
        saveCells(scheduleId, {
          expectedVersion: 1,
          changes: [{ employeeId, workDate: range.from, shift: sentShift }],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    },
  )

  it('creates and reads a specific immutable publication with its exact source version', async () => {
    const meta = {
      id: publicationId,
      scheduleId,
      range,
      sourceVersion: 1,
      publishedAt: '2026-11-09T12:00:00Z',
    }
    const source = calendar()
    const publication: PublicationResponse = {
      ...meta,
      snapshot: {
        schemaVersion: 1,
        schedule: source.schedule,
        range,
        employees: [],
        shifts: [],
        coverage: source.coverage,
      },
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(meta, 201))
      .mockResolvedValueOnce(json(publication))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createPublication(scheduleId, { expectedVersion: 1, ...range })).resolves.toEqual(
      meta,
    )
    const signal = new AbortController().signal
    await expect(getPublication(scheduleId, publicationId, signal)).resolves.toEqual(publication)

    expect(fetchMock.mock.calls[0]![0]).toBe(`/api/v1/schedules/${scheduleId}/publications`)
    expect(fetchMock.mock.calls[1]![0]).toBe(
      `/api/v1/schedules/${scheduleId}/publications/${publicationId}`,
    )
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'GET', signal })
  })
})
