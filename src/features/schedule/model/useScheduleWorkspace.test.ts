import type {
  ApiDateRange,
  ApiShift,
  CalendarResponse,
  PublicationMeta,
  SaveCellsRequest,
} from '@schedule/api/types'
import type { CellRef, ShiftViewModel } from '@schedule/domain/types'
import type { VueWrapper } from '@vue/test-utils'
import { configuredScheduleId } from '@schedule/api/api'
import { scheduleKeys } from '@schedule/api/query'
import { addCalendarDays } from '@schedule/domain/calendar'
import { cellKey } from '@schedule/domain/types'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useScheduleWorkspace } from './useScheduleWorkspace'

const employeeId = '00000000-0000-4000-8000-000000000201'
const shiftId = '00000000-0000-4000-8000-000000000301'
const publicationId = '00000000-0000-4000-8000-000000000401'
const mounted: { wrapper: VueWrapper; client: QueryClient }[] = []

type Workspace = ReturnType<typeof useScheduleWorkspace>
interface RequestRecord {
  method: string
  url: URL
  body: Record<string, unknown> | undefined
}

afterEach(async () => {
  for (const { wrapper, client } of mounted.splice(0)) {
    wrapper.unmount()
    await client.cancelQueries()
    client.clear()
  }
  vi.restoreAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function transport(
  handler: (request: RequestRecord) => Response | Promise<Response>,
): RequestRecord[] {
  const requests: RequestRecord[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, options) => {
    const request = {
      method: options?.method ?? 'GET',
      url: new URL(String(input), 'http://localhost'),
      body: options?.body
        ? (JSON.parse(String(options.body)) as Record<string, unknown>)
        : undefined,
    }
    requests.push(request)
    return Promise.resolve(handler(request))
  })
  return requests
}

function requestedRange(request: RequestRecord): ApiDateRange {
  return { from: request.url.searchParams.get('from')!, to: request.url.searchParams.get('to')! }
}

function assignment(workDate: string, startTime = '08:00', endTime = '16:00'): ApiShift {
  return {
    id: shiftId,
    employeeId,
    workDate,
    startTime,
    endTime,
    endDayOffset: 0,
    sourceTemplateId: null,
    startsAt: new Date(`${workDate}T${startTime}:00+03:00`).toISOString().replace('.000Z', 'Z'),
    endsAt: new Date(`${workDate}T${endTime}:00+03:00`).toISOString().replace('.000Z', 'Z'),
    durationMinutes:
      (Date.parse(`${workDate}T${endTime}:00Z`) - Date.parse(`${workDate}T${startTime}:00Z`)) /
      60_000,
    label: 'Своя смена',
    colorKey: 'custom',
  }
}

function calendar(range: ApiDateRange, version = 1, values: ApiShift[] = []): CalendarResponse {
  const shifts = values.filter((value) => value.workDate >= range.from && value.workDate < range.to)
  const coverage = []
  for (let date = range.from; date < range.to; date = addCalendarDays(date, 1)) {
    const shiftCount = shifts.filter((value) => value.workDate === date).length
    coverage.push({ date, shiftCount, covered: shiftCount > 0 })
  }
  return {
    schedule: { id: configuredScheduleId, name: 'График', timeZone: 'Europe/Moscow', version },
    range: { ...range },
    employees: [
      {
        id: employeeId,
        fullName: 'Анна Смирнова',
        positionTitle: 'Агент',
        avatarUrl: null,
        isActive: true,
        scheduledMinutes: shifts.reduce((sum, value) => sum + value.durationMinutes, 0),
      },
    ],
    shiftTemplates: [],
    shifts,
    coverage,
  }
}

function acknowledgement(version: number, value: ApiShift): Response {
  const { employeeId: owner, workDate, ...normalized } = value
  return json({ version, changedCells: [{ employeeId: owner, workDate, shift: normalized }] })
}

function conflict(version = 2): Response {
  return json(
    {
      error: {
        code: 'SCHEDULE_VERSION_CONFLICT',
        message: 'График изменён.',
        details: { expectedVersion: 1, currentVersion: version },
      },
    },
    409,
  )
}

function writes(requests: RequestRecord[]): RequestRecord[] {
  return requests.filter((request) => request.method !== 'GET')
}

async function createWorkspace(): Promise<{ workspace: Workspace; client: QueryClient }> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  let workspace!: Workspace
  const wrapper = mount(
    defineComponent({
      setup() {
        workspace = useScheduleWorkspace()
        return () => h('div')
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
  )
  mounted.push({ wrapper, client })
  await flushPromises()
  await vi.waitFor(() => expect(workspace.rows.value).toHaveLength(1))
  return { workspace, client }
}

function reference(workspace: Workspace): CellRef {
  return { employeeId, workDate: workspace.range.value.from }
}

function localShift(workspace: Workspace): ShiftViewModel | null {
  return workspace.rows.value[0]?.cells[workspace.range.value.from] ?? null
}

function edit(workspace: Workspace, startTime = '10:00', endTime = '18:00'): ApiShift {
  const value = assignment(workspace.range.value.from, startTime, endTime)
  workspace.rows.value = workspace.rows.value.map((row) => ({
    ...row,
    cells: { ...row.cells, [value.workDate]: { ...value } },
  }))
  return value
}

describe('useScheduleWorkspace write reconciliation', () => {
  it('preserves a stale draft after 409 and writes again only after explicit current-version conflict choices', async () => {
    let version = 1
    let patches = 0
    let saved: ApiShift | undefined
    const requests = transport((request) => {
      if (request.method === 'GET') {
        const range = requestedRange(request)
        return json(
          calendar(range, version, [
            saved ??
              assignment(
                range.from,
                version === 1 ? '08:00' : '09:00',
                version === 1 ? '16:00' : '17:00',
              ),
          ]),
        )
      }
      if (++patches === 1) {
        version = 2
        return conflict()
      }
      const change = (request.body as unknown as SaveCellsRequest).changes[0]!
      saved = assignment(change.workDate, change.shift!.startTime, change.shift!.endTime)
      version = 3
      return acknowledgement(version, saved)
    })
    const { workspace } = await createWorkspace()
    edit(workspace)

    expect(await workspace.save()).toBe(false)
    await flushPromises()

    expect(workspace.reviewOpen.value).toBe(true)
    expect(workspace.remoteUpdated.value).toBe(true)
    expect(workspace.saveVersion.value).toBe(1)
    expect(workspace.dirtyKeys.value).toEqual([cellKey(reference(workspace))])
    expect(localShift(workspace)?.startTime).toBe('10:00')
    expect(workspace.conflicts.value[0]).toMatchObject({
      local: { startTime: '10:00' },
      remote: { startTime: '09:00' },
    })
    expect(workspace.canEdit.value).toBe(false)
    expect(workspace.error.value).toBe('')
    expect(writes(requests)).toHaveLength(1)

    expect(
      workspace.confirmRebase({
        remoteVersion: 1,
        resolutions: [{ cell: reference(workspace), choice: 'local' }],
      }),
    ).toBe(false)
    expect(workspace.reviewOpen.value).toBe(true)
    expect(
      workspace.confirmRebase({
        remoteVersion: 2,
        resolutions: [{ cell: reference(workspace), choice: 'local' }],
      }),
    ).toBe(true)
    expect(workspace.remoteUpdated.value).toBe(false)
    expect(workspace.saveVersion.value).toBe(2)

    expect(await workspace.save()).toBe(true)
    expect(writes(requests).map((request) => request.body?.expectedVersion)).toEqual([1, 2])
    expect(workspace.dirtyKeys.value).toEqual([])
    expect(workspace.remoteVersion.value).toBe(3)
  })

  it('reconciles an unknown PATCH outcome with GET and review instead of resending the mutation', async () => {
    let version = 1
    const requests = transport((request) => {
      if (request.method === 'GET') {
        const range = requestedRange(request)
        return json(
          calendar(range, version, version === 1 ? [] : [assignment(range.from, '09:00', '17:00')]),
        )
      }
      version = 2
      return Promise.reject(new TypeError('Connection lost after sending the request'))
    })
    const { workspace } = await createWorkspace()
    edit(workspace)

    expect(await workspace.save()).toBe(false)
    expect(workspace.remoteUpdated.value).toBe(true)
    expect(workspace.error.value).toContain('Результат сохранения неизвестен')
    const readsBeforeRetry = requests.filter((request) => request.method === 'GET').length

    await workspace.retry()
    await flushPromises()

    expect(requests.filter((request) => request.method === 'GET').length).toBeGreaterThan(
      readsBeforeRetry,
    )
    expect(writes(requests)).toHaveLength(1)
    expect(workspace.reviewOpen.value).toBe(true)
    expect(workspace.remoteVersion.value).toBe(2)
    expect(workspace.saveVersion.value).toBe(1)
    expect(localShift(workspace)?.startTime).toBe('10:00')
    expect(
      workspace.confirmRebase({
        remoteVersion: 2,
        resolutions: [{ cell: reference(workspace), choice: 'remote' }],
      }),
    ).toBe(true)
    expect(workspace.dirtyKeys.value).toEqual([])
    expect(localShift(workspace)?.startTime).toBe('09:00')
    expect(await workspace.save()).toBe(true)
    expect(writes(requests)).toHaveLength(1)
  })

  it('freezes publication range and the PATCH acknowledgement version across a newer GET and an uncertain POST retry', async () => {
    const patch = deferred<Response>()
    let version = 1
    let publicationAttempts = 0
    const requests = transport((request) => {
      if (request.method === 'GET') {
        const range = requestedRange(request)
        return json(
          calendar(range, version, version === 1 ? [] : [assignment(range.from, '09:00', '17:00')]),
        )
      }
      if (request.method === 'PATCH') return patch.promise
      if (++publicationAttempts === 1)
        return Promise.reject(new TypeError('Publication response was lost'))
      const input = request.body!
      const publication: PublicationMeta = {
        id: publicationId,
        scheduleId: configuredScheduleId,
        range: { from: String(input.from), to: String(input.to) },
        sourceVersion: Number(input.expectedVersion),
        publishedAt: '2026-11-11T12:00:00Z',
      }
      return json(publication, 201)
    })
    const { workspace, client } = await createWorkspace()
    const local = edit(workspace)
    const range = { ...workspace.range.value }
    const publicationRange = { startDate: range.from, endDate: range.to }
    const publishing = workspace.publish(publicationRange)
    await flushPromises()
    expect(workspace.busy.value).toBe(true)
    expect(writes(requests).map((request) => request.method)).toEqual(['PATCH'])

    version = 3
    client.setQueryData(
      scheduleKeys.calendar(configuredScheduleId, range),
      calendar(range, 3, [assignment(range.from, '09:00', '17:00')]),
    )
    await flushPromises()
    expect(workspace.remoteVersion.value).toBe(3)
    patch.resolve(acknowledgement(2, local))
    expect(await publishing).toBe(false)
    expect(workspace.error.value).toContain('Результат публикации неизвестен')
    expect(workspace.dirtyKeys.value).toEqual([])
    expect(workspace.remoteVersion.value).toBe(3)

    expect(
      await workspace.publish({ startDate: range.to, endDate: addCalendarDays(range.to, 7) }),
    ).toBe(false)
    expect(writes(requests).map((request) => request.method)).toEqual(['PATCH', 'POST'])
    expect(workspace.error.value).toContain(range.from)
    expect(workspace.error.value).toContain(range.to)
    expect(workspace.error.value).toContain('закройте окно')
    expect(await workspace.publish(publicationRange)).toBe(true)
    expect(writes(requests).map((request) => request.method)).toEqual(['PATCH', 'POST', 'POST'])
    expect(
      writes(requests)
        .filter((request) => request.method === 'POST')
        .map((request) => request.body),
    ).toEqual([
      { expectedVersion: 2, from: range.from, to: range.to },
      { expectedVersion: 2, from: range.from, to: range.to },
    ])
    expect(workspace.latestPublication.value).toMatchObject({
      id: publicationId,
      sourceVersion: 2,
      range,
    })
  })

  it('never publishes after a rejected prerequisite save and retains the actionable cell error and draft', async () => {
    const requests = transport((request) => {
      if (request.method === 'GET') return json(calendar(requestedRange(request)))
      const change = (request.body as unknown as SaveCellsRequest).changes[0]!
      return json(
        {
          error: {
            code: 'SHIFT_OVERLAP',
            message: 'Смена пересекается с другой сменой.',
            details: { employeeId, workDate: change.workDate },
          },
        },
        422,
      )
    })
    const { workspace } = await createWorkspace()
    edit(workspace)

    expect(
      await workspace.publish({
        startDate: workspace.range.value.from,
        endDate: workspace.range.value.to,
      }),
    ).toBe(false)
    await flushPromises()

    expect(writes(requests).map((request) => request.method)).toEqual(['PATCH'])
    expect(workspace.error.value).toContain('Смена пересекается')
    expect(workspace.error.value).toContain('Анна Смирнова')
    expect(workspace.error.value).toContain(workspace.range.value.from)
    expect(workspace.dirtyKeys.value).toEqual([cellKey(reference(workspace))])
    expect(workspace.remoteUpdated.value).toBe(false)
    expect(workspace.latestPublication.value).toBeNull()
    expect(workspace.busy.value).toBe(false)
  })
})

describe('useScheduleWorkspace transition guards', () => {
  it('keeps a dirty range until approval and prevents navigation, discard and duplicate writes throughout save-and-continue', async () => {
    const patch = deferred<Response>()
    let version = 1
    const requests = transport((request) =>
      request.method === 'GET' ? json(calendar(requestedRange(request), version)) : patch.promise,
    )
    const { workspace } = await createWorkspace()
    const initialRange = { ...workspace.range.value }
    const local = edit(workspace)
    workspace.navigate('home')
    expect(workspace.currentPage.value).toBe('schedule')
    expect(workspace.unsavedOpen.value).toBe(true)
    workspace.cancelTransition()
    expect(workspace.unsavedOpen.value).toBe(false)

    workspace.requestPeriod('week', initialRange.to)
    expect(workspace.range.value).toEqual(initialRange)
    expect(workspace.unsavedOpen.value).toBe(true)
    const continuing = workspace.saveAndContinue()
    expect(workspace.busy.value).toBe(true)
    expect(workspace.canEdit.value).toBe(false)
    expect(workspace.canSave.value).toBe(false)
    expect(workspace.canPublish.value).toBe(false)
    await flushPromises()

    workspace.requestPeriod('month', initialRange.from)
    workspace.navigate('home')
    workspace.cancelTransition()
    workspace.discardAndContinue()
    expect(await workspace.save()).toBe(false)
    expect(
      await workspace.publish({ startDate: initialRange.from, endDate: initialRange.to }),
    ).toBe(false)
    expect(workspace.range.value).toEqual(initialRange)
    expect(workspace.currentPage.value).toBe('schedule')
    expect(workspace.unsavedOpen.value).toBe(true)
    expect(writes(requests)).toHaveLength(1)
    const unloading = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloading)
    expect(unloading.defaultPrevented).toBe(true)

    version = 2
    patch.resolve(acknowledgement(version, local))
    await continuing
    await flushPromises()
    expect(workspace.range.value).toEqual({
      from: initialRange.to,
      to: addCalendarDays(initialRange.to, 7),
    })
    expect(workspace.view.value).toBe('week')
    expect(workspace.currentPage.value).toBe('schedule')
    expect(workspace.unsavedOpen.value).toBe(false)
    expect(workspace.dirtyKeys.value).toEqual([])
    expect(workspace.busy.value).toBe(false)
  })

  it('keeps the original period and unsaved edits when save-and-continue fails', async () => {
    const requests = transport((request) =>
      request.method === 'GET'
        ? json(calendar(requestedRange(request)))
        : json(
            { error: { code: 'VALIDATION_ERROR', message: 'Неверные данные смены.', details: {} } },
            422,
          ),
    )
    const { workspace } = await createWorkspace()
    const initialRange = { ...workspace.range.value }
    edit(workspace)
    workspace.requestPeriod('week', initialRange.to)

    await workspace.saveAndContinue()
    await flushPromises()

    expect(workspace.range.value).toEqual(initialRange)
    expect(workspace.unsavedOpen.value).toBe(true)
    expect(workspace.dirtyKeys.value).toEqual([cellKey(reference(workspace))])
    expect(workspace.error.value).toBe('Неверные данные смены.')
    expect(writes(requests)).toHaveLength(1)
    workspace.discardAndContinue()
    await flushPromises()
    expect(workspace.range.value.from).toBe(initialRange.to)
    expect(workspace.unsavedOpen.value).toBe(false)
    expect(workspace.dirtyKeys.value).toEqual([])
  })
})
